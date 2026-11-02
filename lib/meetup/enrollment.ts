import type {Prisma,Booking} from "@prisma/client";
import {RentalError} from "../rental-errors";
import {secret,ttlSeconds,checkInTtlSeconds,confirmationTtlSeconds} from "./config";
import {locationSettings} from "./location";
export const AUTOMATIC_ENROLLMENT = "NEW_BOOKING_VERIFICATION";
/** Within the new Booking transaction: failure rolls back the booking, never falls back. */
export async function activateNewBooking(tx: Prisma.TransactionClient, b: Pick<Booking,"id"|"ownerId"|"renterId"|"meetingStationId">) {
  try { secret(); ttlSeconds(); checkInTtlSeconds(); confirmationTtlSeconds(); }
  catch { throw new RentalError("Meetup verification must be configured before creating a rental booking.",503); }
  const station=await tx.mrtStation.findUniqueOrThrow({where:{id:b.meetingStationId}});
  locationSettings(station.canonicalId??"");
  await tx.meetupSession.create({data:{bookingId:b.id,enabledBy:b.ownerId}});
  await tx.meetupEvent.create({data:{bookingId:b.id,actorId:b.renterId,purpose:"PICKUP",kind:AUTOMATIC_ENROLLMENT}});
}
