/*
 Navicat Premium Data Transfer

 Source Server         : Rio [EC2]
 Source Server Type    : PostgreSQL
 Source Server Version : 90209
 Source Host           : rio-server.axismaps.com
 Source Database       : rio
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90209
 File Encoding         : utf-8

 Date: 11/25/2014 14:02:15 PM
*/

-- ----------------------------
--  Table structure for baseline
-- ----------------------------
DROP TABLE IF EXISTS "public"."baseline";
CREATE TABLE "public"."baseline" (
	"gid" int4 NOT NULL DEFAULT nextval('baseline_gid_seq'::regclass),
	"namecomple" varchar(50) COLLATE "default",
	"featuretyp" varchar(50) COLLATE "default",
	"nameshort" varchar(50) COLLATE "default",
	"yearfirstd" int2,
	"yearlastdo" int2,
	"firstdispl" int2,
	"lastdispla" int2,
	"source" varchar(50) COLLATE "default",
	"folder" varchar(50) COLLATE "default",
	"geodatabas" varchar(50) COLLATE "default",
	"layer" varchar(50) COLLATE "default",
	"tablename" varchar(50) COLLATE "default",
	"globalid" varchar(50) NOT NULL COLLATE "default",
	"geom" "public"."geometry",
	"uploaddate" int4,
	"notes" varchar(255) COLLATE "default",
	"nameabbrev" varchar(50) COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."baseline" OWNER TO "pg_power_user";

-- ----------------------------
--  Primary key structure for table baseline
-- ----------------------------
ALTER TABLE "public"."baseline" ADD PRIMARY KEY ("gid", "globalid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Indexes structure for table baseline
-- ----------------------------
CREATE INDEX  "baseline_gist" ON "public"."baseline" USING gist(geom);
CREATE INDEX  "baseline_layer" ON "public"."baseline" USING btree(layer COLLATE "default" ASC NULLS LAST, firstdispl ASC NULLS LAST, lastdispla ASC NULLS LAST);

