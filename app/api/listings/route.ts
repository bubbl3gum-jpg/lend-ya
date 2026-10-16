import { parseStationIds, eligibleStationWhere, stationSelect } from "@/lib/mrt/network";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, internalServerError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parseCurrency, parseRequiredString } from "@/lib/api-validation";
import { categoryDetailFields, listingCategories } from "@/lib/listing-options";
import { deleteStoredListingMedia, storeListingMedia, validateListingMedia } from "@/lib/listing-media";

const listingSelect = {
  id: true,
  ownerId: true,
  title: true,
  description: true,
  category: true,
  categoryDetails: true,
  price: true,
  deposit: true,
  condition: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  media: {
    select: { id: true, url: true, mimeType: true, kind: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
  bookings: {
    where: { status: { in: ["HANDOFF_PENDING", "IN_USE", "RETURN_PENDING", "INSPECTION", "DISPUTED"] } },
    select: { status: true },
  },
  reports: {
    where: { status: "OPEN" },
    select: { id: true },
    take: 1,
  },
  supportedStations: {
    select: {
      station: { select: stationSelect },
    },
  },
} satisfies Prisma.ListingSelect;

export async function GET(): Promise<Response> {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: listingSelect,
    });

    return Response.json({ listings });
  } catch (error) {
    return internalServerError("GET /api/listings", error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiError("Authentication required.", 401);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 60 * 1024 * 1024) {
      return apiError("The combined photo and video size must be 60 MB or smaller.", 413);
    }
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return apiError("Listing creation requires a multipart request with at least one photo.", 400);
    }

    const formData = await request.formData();
    const title = parseRequiredString(formData.get("title"), 120);
    const description = parseRequiredString(formData.get("description"), 2000);
    const rawCategory = formData.get("category");
    const category = typeof rawCategory === "string" && listingCategories.includes(rawCategory as (typeof listingCategories)[number])
      ? rawCategory as (typeof listingCategories)[number]
      : null;
    const condition = parseRequiredString(formData.get("condition"), 100);
    const price = parseCurrency(formData.get("price"), false);
    const rawDeposit = formData.get("deposit");
    const deposit = rawDeposit === null || rawDeposit === "" ? null : parseCurrency(rawDeposit, true);
    let stationInput: unknown = null;
    try {
      stationInput = JSON.parse(String(formData.get("stationIds") ?? ""));
    } catch {
      stationInput = null;
    }
    const stationIds = parseStationIds(stationInput);

    const photoEntries = formData.getAll("photos");
    const videoEntry = formData.get("video");
    if (photoEntries.some((entry) => !(entry instanceof File))) {
      return apiError("Photos must be uploaded as files.", 400);
    }
    if (videoEntry !== null && !(videoEntry instanceof File)) {
      return apiError("The optional video must be uploaded as a file.", 400);
    }
    const photos = photoEntries.filter((entry): entry is File => entry instanceof File);
    const video = videoEntry instanceof File && videoEntry.size > 0 ? videoEntry : null;

    if (
      title === null ||
      description === null ||
      category === null ||
      condition === null ||
      price === null ||
      (rawDeposit !== null && rawDeposit !== "" && deposit === null) ||
      !stationIds ||
      stationIds.length === 0
    ) {
      return apiError(
        "Provide a valid title, description, category, condition, price, deposit, and at least one pickup station.",
        400,
      );
    }

    const fields = categoryDetailFields[category];
    const categoryDetails: Record<string, string> = {};
    for (const field of fields) {
      const value = formData.get(`detail_${field.key}`);
      if (value !== null && typeof value !== "string") {
        return apiError("Category details must be text.", 400);
      }
      if (typeof value === "string" && value.trim()) {
        if (value.trim().length > 180) {
          return apiError("Category detail values must be 180 characters or fewer.", 400);
        }
        categoryDetails[field.key] = value.trim();
      }
    }

    const mediaError = await validateListingMedia(photos, video);
    if (mediaError) {
      return apiError(mediaError, 400);
    }

    const validStations = await prisma.mrtStation.findMany({
      where: { id: { in: stationIds }, ...eligibleStationWhere },
      select: { id: true },
    });
    if (validStations.length !== stationIds.length) {
      return apiError("One or more pickup stations are invalid.", 400);
    }

    const uploads = [
      ...photos.map((file) => ({ file, kind: "PHOTO" as const })),
      ...(video ? [{ file: video, kind: "VIDEO" as const }] : []),
    ];
    const storedMedia = await storeListingMedia(uploads);
    try {
      const listing = await prisma.$transaction(async (tx) =>
        tx.listing.create({
          data: {
            title,
            description,
            category,
            ...(Object.keys(categoryDetails).length > 0
              ? { categoryDetails: categoryDetails as Prisma.InputJsonObject }
              : {}),
            price,
            deposit,
            condition,
            status: "ACTIVE",
            ownerId: currentUser.id,
            supportedStations: {
              create: stationIds.map((stationId) => ({ stationId })),
            },
            media: {
              create: storedMedia.map(({ url, mimeType, kind }) => ({ url, mimeType, kind })),
            },
          },
          select: listingSelect,
        }),
      );

      return Response.json({ listing }, { status: 201 });
    } catch (error) {
      await deleteStoredListingMedia(storedMedia);
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Uploaded file")) {
      return apiError(error.message, 400);
    }
    return internalServerError("POST /api/listings", error);
  }
}