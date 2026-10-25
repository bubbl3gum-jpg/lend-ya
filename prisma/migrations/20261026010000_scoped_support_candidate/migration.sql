-- SQL-managed isolated candidate schema. No production installer or role activation.
BEGIN;
DO $$ BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Owned Support candidate required' USING ERRCODE='23514'; END IF;
END $$;
CREATE SCHEMA hustlen_support_candidate;
REVOKE ALL ON SCHEMA hustlen_support_candidate FROM PUBLIC;
CREATE TABLE hustlen_support_candidate.configuration (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), "runId" varchar(24) NOT NULL CHECK("runId" ~ '^[a-f0-9]{24}$'),
 "configHash" varchar(64) NOT NULL CHECK("configHash" ~ '^[a-f0-9]{64}$'), "runtimeRole" name NOT NULL, "workerRole" name NOT NULL,
 "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(), "expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '1 hour'), "ticketLimit" int NOT NULL CHECK("ticketLimit" BETWEEN 1 AND 20), "messageLimit" int NOT NULL CHECK("messageLimit" BETWEEN 1 AND 100)
);
CREATE TABLE hustlen_support_candidate.requester ("userId" int PRIMARY KEY REFERENCES public."User"(id));
CREATE TABLE hustlen_support_candidate.member (
 id uuid PRIMARY KEY, "userId" int UNIQUE NOT NULL REFERENCES public."User"(id), "personId" uuid UNIQUE NOT NULL REFERENCES public."StaffPerson"(id),
 "associationId" uuid UNIQUE NOT NULL REFERENCES public."StaffAccountAssociation"(id), "draftMembershipId" uuid UNIQUE NOT NULL REFERENCES public."StaffMembership"(id),
 state text NOT NULL CHECK(state IN ('TEST_ACTIVE','TEST_REVOKED')), version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 "revokedAt" timestamp(3), "revokedByPersonId" uuid REFERENCES public."StaffPerson"(id), "revocationRef" uuid,
 CHECK((state='TEST_REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByPersonId" IS NOT NULL AND "revocationRef" IS NOT NULL) OR (state='TEST_ACTIVE' AND "revokedAt" IS NULL AND "revokedByPersonId" IS NULL AND "revocationRef" IS NULL)),
 policy text NOT NULL CHECK(policy='support-scoped-owned-8d-v1'), "validFrom" timestamp(3) NOT NULL, "expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"validFrom" AND "expiresAt"<="validFrom"+interval '1 hour')
);
CREATE TABLE hustlen_support_candidate.assignment (
 id uuid PRIMARY KEY, "ticketId" uuid NOT NULL REFERENCES public."SupportTicket"(id), "memberId" uuid NOT NULL REFERENCES hustlen_support_candidate.member(id),
 "issuedByPersonId" uuid NOT NULL REFERENCES public."StaffPerson"(id), "provenanceRef" uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('TEST_ACTIVE','TEST_REVOKED')), version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 "validFrom" timestamp(3) NOT NULL, "expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"validFrom" AND "expiresAt"<="validFrom"+interval '1 hour'), "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(),
 "revokedAt" timestamp(3), "revokedByPersonId" uuid REFERENCES public."StaffPerson"(id), "revocationRef" uuid, CHECK((state='TEST_REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByPersonId" IS NOT NULL AND "revocationRef" IS NOT NULL) OR (state='TEST_ACTIVE' AND "revokedAt" IS NULL AND "revokedByPersonId" IS NULL AND "revocationRef" IS NULL)), UNIQUE(id,"ticketId")
);
CREATE UNIQUE INDEX support_candidate_one_assignment ON hustlen_support_candidate.assignment("ticketId") WHERE state='TEST_ACTIVE';
CREATE TABLE hustlen_support_candidate.channel_grant (
 id uuid PRIMARY KEY, "assignmentId" uuid NOT NULL, "ticketId" uuid NOT NULL, "channelId" uuid REFERENCES public."SupportParticipantChannel"(id),
 action text NOT NULL CHECK(action IN ('ticket.metadata.read','ticket.events.read','channel.read','channel.reply')),
 "issuedByPersonId" uuid NOT NULL REFERENCES public."StaffPerson"(id), "provenanceRef" uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('TEST_ACTIVE','TEST_REVOKED')), version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 "validFrom" timestamp(3) NOT NULL, "expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"validFrom" AND "expiresAt"<="validFrom"+interval '1 hour'), "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(), "revokedAt" timestamp(3), "revokedByPersonId" uuid REFERENCES public."StaffPerson"(id), "revocationRef" uuid,
 CHECK((state='TEST_REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByPersonId" IS NOT NULL AND "revocationRef" IS NOT NULL) OR (state='TEST_ACTIVE' AND "revokedAt" IS NULL AND "revokedByPersonId" IS NULL AND "revocationRef" IS NULL)), CHECK((action LIKE 'channel.%')=("channelId" IS NOT NULL)),
 FOREIGN KEY("assignmentId","ticketId") REFERENCES hustlen_support_candidate.assignment(id,"ticketId")
);
CREATE UNIQUE INDEX support_candidate_unique_grant ON hustlen_support_candidate.channel_grant("assignmentId",action,COALESCE("channelId",'00000000-0000-0000-0000-000000000000'::uuid));
CREATE TABLE hustlen_support_candidate.authorization_history (
 id bigserial PRIMARY KEY, "objectKind" text NOT NULL, "objectId" uuid NOT NULL, version bigint NOT NULL, state text NOT NULL,
 "issuedByPersonId" uuid, "provenanceRef" uuid, "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(), UNIQUE("objectKind","objectId",version)
);
CREATE TABLE hustlen_support_candidate.binding (
 id uuid PRIMARY KEY, "memberId" uuid NOT NULL REFERENCES hustlen_support_candidate.member(id), "memberVersion" bigint NOT NULL,
 "assuranceId" uuid UNIQUE NOT NULL REFERENCES public."StaffMfaAssurance"(id), "sessionId" int NOT NULL, "sessionBorn" timestamp(3) NOT NULL,
 epoch bigint NOT NULL, "expiresAt" timestamp(3) NOT NULL
);
CREATE TABLE hustlen_support_candidate.audit (
 id uuid PRIMARY KEY, "correlationId" uuid UNIQUE NOT NULL, "userId" int NOT NULL, "personId" uuid NOT NULL, "associationId" uuid NOT NULL,
 "sessionId" int NOT NULL, "sessionBorn" timestamp(3) NOT NULL, "memberId" uuid NOT NULL, "memberVersion" bigint NOT NULL,
 "assignmentId" uuid NOT NULL, "assignmentVersion" bigint NOT NULL, "grantId" uuid NOT NULL, "grantVersion" bigint NOT NULL,
 "assuranceId" uuid NOT NULL, epoch bigint NOT NULL, "mfaVersion" bigint NOT NULL, "ticketId" uuid NOT NULL, "channelId" uuid,
 action text NOT NULL CHECK(action IN ('ticket.metadata.read','ticket.events.read','channel.read','channel.reply')),
 "replyId" uuid UNIQUE, outcome text NOT NULL CHECK(outcome='TEST_ACCESS_COMMITTED'), policy text NOT NULL CHECK(policy='support-scoped-owned-8d-v1'),
 "databaseActor" name NOT NULL DEFAULT session_user, "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(),
 CHECK((action='channel.reply')=("replyId" IS NOT NULL)), UNIQUE("replyId",id)
);
CREATE TABLE hustlen_support_candidate.reply (
 id uuid PRIMARY KEY, "channelId" uuid NOT NULL REFERENCES public."SupportParticipantChannel"(id), "ticketId" uuid NOT NULL REFERENCES public."SupportTicket"(id),
 "personId" uuid NOT NULL REFERENCES public."StaffPerson"(id), "requestKey" uuid NOT NULL, "requestHash" varchar(64) NOT NULL CHECK("requestHash" ~ '^[a-f0-9]{64}$'),
 content varchar(2000) NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 2000), "auditId" uuid UNIQUE NOT NULL,
 "createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp(), UNIQUE("channelId","personId","requestKey"),
 FOREIGN KEY(id,"auditId") REFERENCES hustlen_support_candidate.audit("replyId",id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE hustlen_support_candidate.audit ADD FOREIGN KEY("replyId") REFERENCES hustlen_support_candidate.reply(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE hustlen_support_candidate.entry (
 id uuid PRIMARY KEY, "channelId" uuid NOT NULL REFERENCES public."SupportParticipantChannel"(id), sequence int NOT NULL CHECK(sequence>0),
 "requesterMessageId" uuid UNIQUE REFERENCES public."SupportMessage"(id), "staffReplyId" uuid UNIQUE REFERENCES hustlen_support_candidate.reply(id),
 CHECK(("requesterMessageId" IS NULL)<>("staffReplyId" IS NULL)), UNIQUE("channelId",sequence)
);
CREATE FUNCTION hustlen_support_candidate.immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Support candidate history is immutable' USING ERRCODE='23514'; END $$;
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['authorization_history','binding','audit','reply','entry'] LOOP
 EXECUTE format('CREATE TRIGGER support_history_immutable BEFORE UPDATE OR DELETE ON hustlen_support_candidate.%I FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.immutable()',n);
 EXECUTE format('CREATE TRIGGER support_history_no_truncate BEFORE TRUNCATE ON hustlen_support_candidate.%I FOR EACH STATEMENT EXECUTE FUNCTION hustlen_support_candidate.immutable()',n);
 END LOOP;
END $$;
CREATE FUNCTION hustlen_support_candidate.change_history() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revoke instead of deleting' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.state<>'TEST_ACTIVE' OR NEW.state<>'TEST_REVOKED' OR NEW."revokedAt" IS NULL OR NEW."revokedByPersonId" IS NULL OR NEW."revocationRef" IS NULL OR NOT EXISTS(SELECT 1 FROM public."StaffPerson" WHERE id=NEW."revokedByPersonId" AND verification='VERIFIED') OR (to_jsonb(NEW)-ARRAY['state','version','revokedAt','revokedByPersonId','revocationRef'])<>(to_jsonb(OLD)-ARRAY['state','version','revokedAt','revokedByPersonId','revocationRef']) THEN RAISE EXCEPTION 'Only explicit revocation is permitted' USING ERRCODE='23514'; END IF;
  NEW.version=OLD.version+1;
 ELSE NEW.version=1; END IF;
 INSERT INTO hustlen_support_candidate.authorization_history("objectKind","objectId",version,state,"issuedByPersonId","provenanceRef") VALUES(TG_TABLE_NAME,NEW.id,NEW.version,NEW.state,COALESCE((to_jsonb(NEW)->>'revokedByPersonId')::uuid,(to_jsonb(NEW)->>'issuedByPersonId')::uuid),COALESCE((to_jsonb(NEW)->>'revocationRef')::uuid,(to_jsonb(NEW)->>'provenanceRef')::uuid));
 RETURN NEW;
END $$;
CREATE TRIGGER support_member_history BEFORE INSERT OR UPDATE OR DELETE ON hustlen_support_candidate.member FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.change_history();
CREATE TRIGGER support_assignment_history BEFORE INSERT OR UPDATE OR DELETE ON hustlen_support_candidate.assignment FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.change_history();
CREATE TRIGGER support_grant_history BEFORE INSERT OR UPDATE OR DELETE ON hustlen_support_candidate.channel_grant FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.change_history();
CREATE TRIGGER support_member_no_truncate BEFORE TRUNCATE ON hustlen_support_candidate.member FOR EACH STATEMENT EXECUTE FUNCTION hustlen_support_candidate.immutable();
CREATE TRIGGER support_assignment_no_truncate BEFORE TRUNCATE ON hustlen_support_candidate.assignment FOR EACH STATEMENT EXECUTE FUNCTION hustlen_support_candidate.immutable();
CREATE TRIGGER support_grant_no_truncate BEFORE TRUNCATE ON hustlen_support_candidate.channel_grant FOR EACH STATEMENT EXECUTE FUNCTION hustlen_support_candidate.immutable();
CREATE FUNCTION hustlen_support_candidate.assignment_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE person uuid; tid uuid;
BEGIN
 IF TG_TABLE_NAME='assignment' THEN SELECT "personId" INTO person FROM hustlen_support_candidate.member WHERE id=NEW."memberId"; tid=NEW."ticketId";
 ELSE SELECT m."personId" INTO person FROM hustlen_support_candidate.assignment a JOIN hustlen_support_candidate.member m ON m.id=a."memberId" WHERE a.id=NEW."assignmentId" AND a."ticketId"=NEW."ticketId"; tid=NEW."ticketId";
  IF NEW."channelId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public."SupportParticipantChannel" WHERE id=NEW."channelId" AND "ticketId"=tid) THEN RAISE EXCEPTION 'Invalid channel scope' USING ERRCODE='23514'; END IF;
 END IF;
 IF person IS NULL OR hustlen_support_candidate.conflict(person,-1,tid) OR hustlen_support_candidate.conflict(NEW."issuedByPersonId",-1,tid) OR person=NEW."issuedByPersonId" OR NOT EXISTS(SELECT 1 FROM public."StaffPerson" WHERE id=NEW."issuedByPersonId" AND verification='VERIFIED') OR EXISTS(SELECT 1 FROM public."SupportTicket" t JOIN public."StaffAccountAssociation" alias ON alias."userId"=t."requesterUserId" WHERE t.id=tid AND alias."personId"=NEW."issuedByPersonId") THEN RAISE EXCEPTION 'Independent verified assignment authority required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_assignment_integrity BEFORE INSERT ON hustlen_support_candidate.assignment FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.assignment_integrity();
CREATE TRIGGER a_grant_integrity BEFORE INSERT ON hustlen_support_candidate.channel_grant FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.assignment_integrity();
CREATE FUNCTION hustlen_support_candidate.stream_requester() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
BEGIN
 PERFORM id FROM public."SupportParticipantChannel" WHERE id=NEW."channelId" FOR UPDATE;
 INSERT INTO hustlen_support_candidate.entry(id,"channelId",sequence,"requesterMessageId") SELECT gen_random_uuid(),NEW."channelId",COALESCE(max(sequence),0)+1,NEW.id FROM hustlen_support_candidate.entry WHERE "channelId"=NEW."channelId";
 RETURN NEW;
END $$;
INSERT INTO hustlen_support_candidate.entry(id,"channelId",sequence,"requesterMessageId") SELECT gen_random_uuid(),"channelId",sequence,id FROM public."SupportMessage";
CREATE TRIGGER support_requester_stream AFTER INSERT ON public."SupportMessage" FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.stream_requester();
CREATE FUNCTION hustlen_support_candidate.gate(kind text) RETURNS hustlen_support_candidate.configuration LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE c hustlen_support_candidate.configuration;
BEGIN
 SELECT * INTO c FROM hustlen_support_candidate.configuration WHERE singleton FOR SHARE;
 IF NOT FOUND OR current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database')='hustlen-mrt-test:'||c."runId") OR c."expiresAt"<=clock_timestamp() OR (kind='staff' AND session_user<>c."workerRole") OR (kind='requester' AND session_user<>c."runtimeRole") OR kind NOT IN ('staff','requester') THEN RAISE EXCEPTION 'Scoped Support unavailable'; END IF;
 IF has_any_column_privilege(session_user,'public."AuthSession"','INSERT') OR has_any_column_privilege(session_user,'public."AuthSession"','UPDATE') OR has_column_privilege(session_user,'public."User"','passwordHash','UPDATE') THEN RAISE EXCEPTION 'Restricted Support principal required'; END IF;
 RETURN c;
END $$;
CREATE FUNCTION hustlen_support_candidate.login_ready() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$ BEGIN PERFORM hustlen_support_candidate.gate('staff'); RETURN true; END $$;
CREATE FUNCTION hustlen_support_candidate.session(token text, exclusive_user boolean DEFAULT false) RETURNS public."AuthSession" LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE s public."AuthSession";
BEGIN
 IF token IS NULL OR length(token)<20 OR length(token)>256 THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO s FROM public."AuthSession" WHERE "tokenHash"=encode(sha256(convert_to(token,'UTF8')),'hex') FOR SHARE;
 IF NOT FOUND OR s."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 IF exclusive_user THEN
  PERFORM id FROM public."User" WHERE id=s."userId" AND "accountStatus"='ACTIVE' FOR UPDATE;
 ELSE
  PERFORM id FROM public."User" WHERE id=s."userId" AND "accountStatus"='ACTIVE' FOR SHARE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN s;
END $$;
-- No private content selection: canonical aliases and both booking participants are conflicts.
CREATE FUNCTION hustlen_support_candidate.conflict(person uuid, uid int, tid uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
 SELECT EXISTS(
 SELECT 1 FROM public."SupportTicket" t
 LEFT JOIN public."Dispute" d ON d.id=t."disputeId"
 LEFT JOIN public."Booking" b ON b.id=COALESCE(t."bookingId",d."bookingId")
 LEFT JOIN public."ListingReport" r ON r.id=t."reportId"
 LEFT JOIN public."Listing" l ON l.id=COALESCE(t."listingId",r."listingId")
 CROSS JOIN LATERAL unnest(ARRAY[t."requesterUserId",b."ownerId",b."renterId",l."ownerId",r."reporterId"]) involved(id)
 WHERE t.id=tid AND (involved.id=uid OR EXISTS(SELECT 1 FROM public."StaffAccountAssociation" alias WHERE alias."userId"=involved.id AND alias."personId"=person)))
$$;
CREATE FUNCTION hustlen_support_candidate.core(token text, assurance uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE c hustlen_support_candidate.configuration; s public."AuthSession"; m hustlen_support_candidate.member;
 a public."StaffAccountAssociation"; p public."StaffPerson"; v public."StaffAuthorizationVersion"; d public."StaffMembership";
 b hustlen_support_candidate.binding; proof public."StaffMfaAssurance"; mv public."StaffMfaVersion"; k public."StaffMfaCredential";
BEGIN
 c=hustlen_support_candidate.gate('staff'); s=hustlen_support_candidate.session(token);
 PERFORM id FROM public."User" WHERE id=s."userId" AND role='USER'; IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO m FROM hustlen_support_candidate.member WHERE "userId"=s."userId" FOR SHARE;
 IF NOT FOUND OR m.state<>'TEST_ACTIVE' OR m.policy<>'support-scoped-owned-8d-v1' OR m."validFrom">clock_timestamp() OR m."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO a FROM public."StaffAccountAssociation" WHERE id=m."associationId" AND "userId"=s."userId" AND "personId"=m."personId" FOR SHARE;
 IF NOT FOUND OR a.state<>'VERIFIED' OR a."verifiedAt" IS NULL THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO p FROM public."StaffPerson" WHERE id=a."personId" FOR SHARE;
 IF NOT FOUND OR p.verification<>'VERIFIED' THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO v FROM public."StaffAuthorizationVersion" WHERE "personId"=p.id FOR SHARE;
 IF NOT FOUND OR v."policyVersion"<>'hustlen-admin-shadow-v1' THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO d FROM public."StaffMembership" WHERE id=m."draftMembershipId" AND "personId"=p.id FOR SHARE;
 IF NOT FOUND OR d.state<>'DRAFT' OR d.role<>'SUPPORT' OR d."policyVersion"<>v."policyVersion" OR d."validFrom">clock_timestamp() OR d."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 IF assurance IS NULL THEN
  SELECT * INTO b FROM hustlen_support_candidate.binding WHERE "memberId"=m.id AND "memberVersion"=m.version AND "sessionId"=s.id AND "sessionBorn"=s."createdAt" AND epoch=v.version AND "expiresAt">clock_timestamp() ORDER BY "expiresAt" DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF; assurance=b."assuranceId";
 END IF;
 SELECT * INTO proof FROM public."StaffMfaAssurance" WHERE id=core.assurance;
 SELECT * INTO mv FROM public."StaffMfaVersion" WHERE "associationId"=a.id FOR SHARE;
 IF proof.id IS NULL OR mv.version IS NULL OR proof."associationId"<>a.id OR proof."authSessionId"<>s.id OR proof."authSessionCreatedAt"<>s."createdAt" OR proof."authorizationVersion"<>v.version OR proof."mfaVersion"<>mv.version OR proof."policyVersion"<>v."policyVersion" OR proof."configHash"<>c."configHash" OR proof.assurance<>'WEBAUTHN_UV' OR proof."verifiedAt">clock_timestamp() OR proof."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO k FROM public."StaffMfaCredential" WHERE id=proof."credentialKey" FOR SHARE;
 IF NOT FOUND OR k."associationId"<>a.id OR k."rpId"<>'localhost' OR k."revokedAt" IS NOT NULL THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN jsonb_build_object('userId',s."userId",'personId',p.id,'associationId',a.id,'sessionId',s.id,'sessionBorn',s."createdAt",'memberId',m.id,'memberVersion',m.version,'assuranceId',proof.id,'epoch',v.version,'mfaVersion',mv.version,'expiresAt',LEAST(s."expiresAt",m."expiresAt",d."expiresAt",proof."expiresAt",c."expiresAt"));
END $$;
CREATE FUNCTION hustlen_support_candidate.admit(token text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE s public."AuthSession";
BEGIN
 PERFORM hustlen_support_candidate.gate('staff'); s=hustlen_support_candidate.session(token);
 IF NOT EXISTS(SELECT 1 FROM hustlen_support_candidate.member m JOIN public."StaffAccountAssociation" a ON a.id=m."associationId" AND a."userId"=s."userId" AND a."personId"=m."personId" AND a.state='VERIFIED' JOIN public."StaffPerson" p ON p.id=a."personId" AND p.verification='VERIFIED' JOIN public."StaffMembership" d ON d.id=m."draftMembershipId" AND d."personId"=p.id AND d.state='DRAFT' AND d.role='SUPPORT' AND d."expiresAt">clock_timestamp() WHERE m."userId"=s."userId" AND m.state='TEST_ACTIVE' AND m."validFrom"<=clock_timestamp() AND m."expiresAt">clock_timestamp()) THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN true;
END $$;
CREATE FUNCTION hustlen_support_candidate.bind(token text, assurance uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE a jsonb;
BEGIN
 a=hustlen_support_candidate.core(token,assurance);
 INSERT INTO hustlen_support_candidate.binding(id,"memberId","memberVersion","assuranceId","sessionId","sessionBorn",epoch,"expiresAt") VALUES(gen_random_uuid(),(a->>'memberId')::uuid,(a->>'memberVersion')::bigint,assurance,(a->>'sessionId')::int,(a->>'sessionBorn')::timestamp,(a->>'epoch')::bigint,(a->>'expiresAt')::timestamp);
 RETURN true;
END $$;
CREATE FUNCTION hustlen_support_candidate.authorize(actor jsonb, tid uuid, cid uuid, wanted text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE a hustlen_support_candidate.assignment; g hustlen_support_candidate.channel_grant; expiry timestamp;
BEGIN
 SELECT * INTO a FROM hustlen_support_candidate.assignment WHERE "ticketId"=tid AND "memberId"=(actor->>'memberId')::uuid FOR SHARE;
 IF NOT FOUND OR a.state<>'TEST_ACTIVE' OR a."validFrom">clock_timestamp() OR a."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 SELECT * INTO g FROM hustlen_support_candidate.channel_grant WHERE "assignmentId"=a.id AND "ticketId"=tid AND "channelId" IS NOT DISTINCT FROM cid AND action=wanted FOR SHARE;
 IF NOT FOUND OR g.state<>'TEST_ACTIVE' OR g."validFrom">clock_timestamp() OR g."expiresAt"<=clock_timestamp() OR hustlen_support_candidate.conflict((actor->>'personId')::uuid,(actor->>'userId')::int,tid) OR a."issuedByPersonId"=(actor->>'personId')::uuid OR g."issuedByPersonId"=(actor->>'personId')::uuid OR hustlen_support_candidate.conflict(a."issuedByPersonId",-1,tid) OR hustlen_support_candidate.conflict(g."issuedByPersonId",-1,tid) THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 PERFORM id FROM public."StaffPerson" WHERE id IN(a."issuedByPersonId",g."issuedByPersonId") AND verification<>'VERIFIED'; IF FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 expiry=LEAST((actor->>'expiresAt')::timestamp,a."expiresAt",g."expiresAt");
 IF expiry<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN actor||jsonb_build_object('assignmentId',a.id,'assignmentVersion',a.version,'grantId',g.id,'grantVersion',g.version,'ticketId',tid,'channelId',cid,'action',wanted,'expiresAt',expiry);
END $$;
CREATE FUNCTION hustlen_support_candidate.record_access(a jsonb, reply uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE id uuid=gen_random_uuid(); BEGIN
 IF (a->>'expiresAt')::timestamp<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 INSERT INTO hustlen_support_candidate.audit(id,"correlationId","userId","personId","associationId","sessionId","sessionBorn","memberId","memberVersion","assignmentId","assignmentVersion","grantId","grantVersion","assuranceId",epoch,"mfaVersion","ticketId","channelId",action,"replyId",outcome,policy) VALUES(id,gen_random_uuid(),(a->>'userId')::int,(a->>'personId')::uuid,(a->>'associationId')::uuid,(a->>'sessionId')::int,(a->>'sessionBorn')::timestamp,(a->>'memberId')::uuid,(a->>'memberVersion')::bigint,(a->>'assignmentId')::uuid,(a->>'assignmentVersion')::bigint,(a->>'grantId')::uuid,(a->>'grantVersion')::bigint,(a->>'assuranceId')::uuid,(a->>'epoch')::bigint,(a->>'mfaVersion')::bigint,(a->>'ticketId')::uuid,(a->>'channelId')::uuid,a->>'action',reply,'TEST_ACCESS_COMMITTED','support-scoped-owned-8d-v1'); RETURN id;
END $$;
CREATE FUNCTION hustlen_support_candidate.transcript(cid uuid, after_seq int) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
 SELECT COALESCE(jsonb_agg(x.row ORDER BY x.sequence),'[]'::jsonb) FROM(
 SELECT e.sequence,jsonb_build_object('id',e.id,'sequence',e.sequence,'authorKind',CASE WHEN e."requesterMessageId" IS NULL THEN 'SUPPORT_TEST' ELSE 'REQUESTER' END,'content',COALESCE(m.content,r.content),'createdAt',COALESCE(m."createdAt",r."createdAt")) row
 FROM hustlen_support_candidate.entry e LEFT JOIN public."SupportMessage" m ON m.id=e."requesterMessageId" AND m."channelId"=cid LEFT JOIN hustlen_support_candidate.reply r ON r.id=e."staffReplyId" AND r."channelId"=cid WHERE e."channelId"=cid AND e.sequence>after_seq ORDER BY e.sequence LIMIT 11) x
$$;
CREATE FUNCTION hustlen_support_candidate.staff_request(token text, body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE actor jsonb; allowed jsonb; read_allowed jsonb; result jsonb; row record; tid uuid; cid uuid; after_seq int; wanted text; keys text[];
 rid uuid; aid uuid; req uuid; digest text; prior hustlen_support_candidate.reply; text_body text; expiry timestamp;
BEGIN
 actor=hustlen_support_candidate.core(token); wanted=body->>'action';
 keys=CASE wanted WHEN 'queue' THEN ARRAY['action'] WHEN 'ticket' THEN ARRAY['action','ticketId'] WHEN 'events' THEN ARRAY['action','ticketId'] WHEN 'channels' THEN ARRAY['action','ticketId'] WHEN 'read' THEN ARRAY['action','ticketId','channelId','after'] WHEN 'reply' THEN ARRAY['action','ticketId','channelId','content','requestKey'] ELSE NULL END;
 IF keys IS NULL OR jsonb_typeof(body)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(body) k WHERE NOT(k=ANY(keys))) THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 expiry=(actor->>'expiresAt')::timestamp;
 IF wanted='queue' THEN
  result='[]'::jsonb;
  FOR row IN SELECT a."ticketId" FROM hustlen_support_candidate.assignment a JOIN hustlen_support_candidate.channel_grant g ON g."assignmentId"=a.id AND g.action='ticket.metadata.read' AND g.state='TEST_ACTIVE' AND g."validFrom"<=clock_timestamp() AND g."expiresAt">clock_timestamp() WHERE a."memberId"=(actor->>'memberId')::uuid AND a.state='TEST_ACTIVE' AND a."validFrom"<=clock_timestamp() AND a."expiresAt">clock_timestamp() ORDER BY a."createdAt",a.id LIMIT 20 LOOP
   allowed=hustlen_support_candidate.authorize(actor,row."ticketId",NULL,'ticket.metadata.read');
   SELECT jsonb_build_object('id',id,'categoryCode',"categoryCode",'currentState',"currentState",'createdAt',"createdAt") INTO result FROM public."SupportTicket" WHERE id=row."ticketId";
   -- A single unauthorized/conflicting row fails the whole bounded disclosure.
   PERFORM hustlen_support_candidate.record_access(allowed);
   expiry=LEAST(expiry,(allowed->>'expiresAt')::timestamp);
   -- Accumulate outside the SELECT target to keep private metadata minimal.
   actor=jsonb_set(actor,'{queue}',COALESCE(actor->'queue','[]'::jsonb)||jsonb_build_array(result));
  END LOOP;
  result=COALESCE(actor->'queue','[]'::jsonb);
 ELSE
  tid=(body->>'ticketId')::uuid;
  IF wanted IN ('ticket','events','channels') THEN
   allowed=hustlen_support_candidate.authorize(actor,tid,NULL,CASE WHEN wanted='events' THEN 'ticket.events.read' ELSE 'ticket.metadata.read' END);
   IF wanted='ticket' THEN
    SELECT jsonb_build_object('id',id,'categoryCode',"categoryCode",'currentState',"currentState",'createdAt',"createdAt") INTO result FROM public."SupportTicket" WHERE id=tid;
   ELSIF wanted='events' THEN
    SELECT COALESCE(jsonb_agg(x.row ORDER BY x.sequence),'[]'::jsonb) INTO result FROM (SELECT sequence,jsonb_build_object('eventType',"eventType",'sequence',sequence,'createdAt',"createdAt") row FROM public."SupportTicketEvent" WHERE "ticketId"=tid ORDER BY sequence LIMIT 20)x;
   ELSE
    -- Only exactly readable channel grants; assignment never enumerates other channels.
    result='[]'::jsonb;
    FOR row IN SELECT "channelId" FROM hustlen_support_candidate.channel_grant WHERE "assignmentId"=(allowed->>'assignmentId')::uuid AND action='channel.read' AND state='TEST_ACTIVE' AND "validFrom"<=clock_timestamp() AND "expiresAt">clock_timestamp() LOOP
     PERFORM hustlen_support_candidate.authorize(actor,tid,row."channelId",'channel.read');
     result=result||jsonb_build_array(jsonb_build_object('id',row."channelId"));
    END LOOP;
   END IF;
   PERFORM hustlen_support_candidate.record_access(allowed);
  ELSE
   cid=(body->>'channelId')::uuid;
   allowed=hustlen_support_candidate.authorize(actor,tid,cid,CASE WHEN wanted='reply' THEN 'channel.reply' ELSE 'channel.read' END);
   PERFORM c.id FROM public."SupportParticipantChannel" c JOIN public."User" u ON u.id=c."participantUserId" AND u."accountStatus"='ACTIVE' WHERE c.id=cid AND c."ticketId"=tid AND c."relationshipSide"=public.support_channel_candidate_side(tid,c."participantUserId") FOR UPDATE OF c;
   IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
   IF wanted='read' THEN
    after_seq=COALESCE((body->>'after')::int,0); IF after_seq<0 THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
    result=hustlen_support_candidate.transcript(cid,after_seq);
    PERFORM hustlen_support_candidate.record_access(allowed);
   ELSE
    read_allowed=hustlen_support_candidate.authorize(actor,tid,cid,'channel.read');
    allowed=jsonb_set(allowed,'{expiresAt}',to_jsonb(LEAST((allowed->>'expiresAt')::timestamp,(read_allowed->>'expiresAt')::timestamp)));
    req=(body->>'requestKey')::uuid; text_body=btrim(body->>'content');
    IF req IS NULL OR text_body IS NULL OR length(text_body) NOT BETWEEN 1 AND 2000 OR text_body !~ '[^[:space:]]' OR translate(text_body,E'\n\r\t','') ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
    digest=encode(sha256(convert_to(text_body,'UTF8')),'hex');
    SELECT * INTO prior FROM hustlen_support_candidate.reply WHERE "channelId"=cid AND "personId"=(actor->>'personId')::uuid AND "requestKey"=req;
    IF FOUND THEN
     IF prior."requestHash"<>digest THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
     -- Replays still require current authority and a committed read audit.
     allowed=hustlen_support_candidate.authorize(actor,tid,cid,'channel.read');
     PERFORM hustlen_support_candidate.record_access(allowed);
     result=jsonb_build_object('id',prior.id,'replayed',true);
    ELSE
     IF (SELECT count(*) FROM hustlen_support_candidate.reply WHERE "channelId"=cid)>=(SELECT "messageLimit" FROM hustlen_support_candidate.configuration WHERE singleton) THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
     rid=gen_random_uuid(); aid=hustlen_support_candidate.record_access(allowed,rid);
     INSERT INTO hustlen_support_candidate.reply(id,"channelId","ticketId","personId","requestKey","requestHash",content,"auditId") VALUES(rid,cid,tid,(actor->>'personId')::uuid,req,digest,text_body,aid);
     INSERT INTO hustlen_support_candidate.entry(id,"channelId",sequence,"staffReplyId") SELECT gen_random_uuid(),cid,COALESCE(max(sequence),0)+1,rid FROM hustlen_support_candidate.entry WHERE "channelId"=cid;
     result=jsonb_build_object('id',rid,'replayed',false);
    END IF;
   END IF;
  END IF;
  expiry=LEAST(expiry,(allowed->>'expiresAt')::timestamp);
 END IF;
 IF expiry<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION hustlen_support_candidate.requester_request(token text, body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,hustlen_support_candidate,pg_temp AS $$
DECLARE cfg hustlen_support_candidate.configuration; s public."AuthSession"; wanted text; keys text[]; tid uuid; cid uuid; side text; t public."SupportTicket"; ch public."SupportParticipantChannel";
 result jsonb; req uuid; digest text; eid uuid; mid uuid; prior public."SupportMessage"; after_seq int; text_body text;
BEGIN
 cfg=hustlen_support_candidate.gate('requester'); s=hustlen_support_candidate.session(token,true);
 IF NOT EXISTS(SELECT 1 FROM hustlen_support_candidate.requester WHERE "userId"=s."userId") THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 wanted=body->>'action'; keys=CASE wanted WHEN 'tickets' THEN ARRAY['action'] WHEN 'create' THEN ARRAY['action','categoryCode','subject','description','requestKey','bookingId','listingId','reportId','disputeId'] WHEN 'ticket' THEN ARRAY['action','ticketId'] WHEN 'channel' THEN ARRAY['action','ticketId'] WHEN 'read' THEN ARRAY['action','ticketId','channelId','after'] WHEN 'message' THEN ARRAY['action','ticketId','channelId','content','requestKey'] ELSE NULL END;
 IF keys IS NULL OR jsonb_typeof(body)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(body) k WHERE NOT(k=ANY(keys))) THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 -- User lock precedes channel/ticket locks, matching immutable requester INSERT triggers.
 PERFORM id FROM public."User" WHERE id=s."userId" AND "accountStatus"='ACTIVE' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 IF wanted='tickets' THEN
  SELECT COALESCE(jsonb_agg(x.row ORDER BY x."createdAt",x.id),'[]'::jsonb) INTO result FROM(SELECT id,"createdAt",jsonb_build_object('id',id,'categoryCode',"categoryCode",'currentState',"currentState",'createdAt',"createdAt") row FROM public."SupportTicket" WHERE "requesterUserId"=s."userId" ORDER BY "createdAt",id LIMIT 20)x;
 ELSIF wanted='create' THEN
  req=(body->>'requestKey')::uuid; digest=encode(sha256(convert_to((body-ARRAY['action','requestKey'])::text,'UTF8')),'hex');
  SELECT * INTO t FROM public."SupportTicket" WHERE "requesterUserId"=s."userId" AND "requestKey"=req;
  IF FOUND THEN IF t."requestHash"<>digest THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
  ELSE
   IF (SELECT count(*) FROM public."SupportTicket" WHERE "requesterUserId"=s."userId")>=cfg."ticketLimit" THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
   tid=gen_random_uuid(); eid=gen_random_uuid();
   INSERT INTO public."SupportTicket"(id,"requesterUserId","categoryCode",subject,description,"bookingId","listingId","reportId","disputeId","requestKey","requestHash","initialEventId","policyVersion","currentState","lifecycleVersion") VALUES(tid,s."userId",body->>'categoryCode',btrim(body->>'subject'),btrim(body->>'description'),(body->>'bookingId')::int,(body->>'listingId')::int,(body->>'reportId')::int,(body->>'disputeId')::int,req,digest,eid,'support-owned-candidate-8b-v1','RECEIVED',1) RETURNING * INTO t;
   INSERT INTO public."SupportTicketEvent"(id,"ticketId","actorUserId","eventType",sequence,"lifecycleVersion","correlationId") VALUES(eid,tid,s."userId",'TICKET_RECEIVED',1,1,req);
  END IF;
  result=jsonb_build_object('id',t.id,'categoryCode',t."categoryCode",'currentState',t."currentState",'createdAt',t."createdAt");
 ELSE
  tid=(body->>'ticketId')::uuid;
  SELECT * INTO t FROM public."SupportTicket" WHERE id=tid AND "requesterUserId"=s."userId" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
  side=public.support_channel_candidate_side(tid,s."userId"); IF side IS NULL THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
  IF wanted='ticket' THEN result=jsonb_build_object('id',t.id,'categoryCode',t."categoryCode",'currentState',t."currentState",'createdAt',t."createdAt");
  ELSE
   SELECT * INTO ch FROM public."SupportParticipantChannel" WHERE "ticketId"=tid AND "participantUserId"=s."userId" FOR UPDATE;
   IF wanted='channel' AND NOT FOUND THEN
    INSERT INTO public."SupportParticipantChannel"(id,"ticketId","participantUserId","relationshipSide","policyVersion") VALUES(gen_random_uuid(),tid,s."userId",side,'support-owned-requester-channel-8c-v1') RETURNING * INTO ch;
   END IF;
   IF ch.id IS NULL OR ch."relationshipSide"<>side THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
   cid=ch.id;
   IF wanted='channel' THEN result=jsonb_build_object('id',cid);
   ELSE
    IF cid IS DISTINCT FROM (body->>'channelId')::uuid THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
    IF wanted='read' THEN after_seq=COALESCE((body->>'after')::int,0); IF after_seq<0 THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
     result=hustlen_support_candidate.transcript(cid,after_seq);
    ELSE
     req=(body->>'requestKey')::uuid; text_body=btrim(body->>'content');
     IF req IS NULL OR text_body IS NULL OR length(text_body) NOT BETWEEN 1 AND 2000 OR text_body !~ '[^[:space:]]' OR translate(text_body,E'\n\r\t','') ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
     digest=encode(sha256(convert_to(text_body,'UTF8')),'hex');
     SELECT * INTO prior FROM public."SupportMessage" WHERE "channelId"=cid AND "authorUserId"=s."userId" AND "requestKey"=req;
     IF FOUND THEN
      IF prior."requestHash"<>digest THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
      result=jsonb_build_object('id',prior.id,'replayed',true);
     ELSE
      IF (SELECT count(*) FROM public."SupportMessage" WHERE "channelId"=cid)>=cfg."messageLimit" THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
      mid=gen_random_uuid();
      INSERT INTO public."SupportMessage"(id,"channelId","ticketId","authorUserId","requestKey","requestHash",content,sequence) SELECT mid,cid,tid,s."userId",req,digest,text_body,COALESCE(max(sequence),0)+1 FROM public."SupportMessage" WHERE "channelId"=cid;
      result=jsonb_build_object('id',mid,'replayed',false);
     END IF;
    END IF;
   END IF;
  END IF;
 END IF;
 IF LEAST(s."expiresAt",cfg."expiresAt")<=clock_timestamp() THEN RAISE EXCEPTION 'Scoped Support denied'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA hustlen_support_candidate FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA hustlen_support_candidate FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hustlen_support_candidate FROM PUBLIC;
COMMENT ON SCHEMA hustlen_support_candidate IS 'Owned development Support candidate; no production role activation';
COMMIT;
