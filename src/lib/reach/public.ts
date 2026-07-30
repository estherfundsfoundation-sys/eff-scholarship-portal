import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

type ProfileRow = {
  ambassador_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  institution: string;
  major: string | null;
  class_year: string | null;
  bio: string;
  why_reach: string | null;
  focus_areas: unknown;
  instagram_url: string | null;
  linkedin_url: string | null;
  public_photo_path: string | null;
};

const publicPhotoUrl = (path: string | null) => {
  if (!path) return null;
  return createAdminClient().storage.from("reach-impact-media").getPublicUrl(path).data.publicUrl;
};

const safeAreas = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];

export async function getPublicReachAmbassadors() {
  const admin = createAdminClient();
  const {data} = await admin
    .from("reach_ambassador_profiles")
    .select("ambassador_id,slug,display_name,headline,institution,major,class_year,bio,why_reach,focus_areas,instagram_url,linkedin_url,public_photo_path")
    .eq("status", "published")
    .order("display_name");
  return ((data ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    focus_areas: safeAreas(profile.focus_areas),
    photo_url: publicPhotoUrl(profile.public_photo_path),
    public_photo_path: undefined,
  }));
}

export async function getPublicReachAmbassador(slug: string) {
  const admin = createAdminClient();
  const {data} = await admin
    .from("reach_ambassador_profiles")
    .select("ambassador_id,slug,display_name,headline,institution,major,class_year,bio,why_reach,focus_areas,instagram_url,linkedin_url,public_photo_path")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const profile = data as ProfileRow;
  const {data: activities} = await admin
    .from("reach_activity_submissions")
    .select("id,title,activity_type,campus,activity_date,description,students_reached,public_photo_paths")
    .eq("ambassador_id", profile.ambassador_id)
    .eq("status", "published")
    .order("activity_date", {ascending: false});
  return {
    ...profile,
    focus_areas: safeAreas(profile.focus_areas),
    photo_url: publicPhotoUrl(profile.public_photo_path),
    public_photo_path: undefined,
    activities: (activities ?? []).map((activity) => ({
      ...activity,
      photo_urls: (Array.isArray(activity.public_photo_paths) ? activity.public_photo_paths : [])
        .filter((path): path is string => typeof path === "string")
        .map((path) => publicPhotoUrl(path))
        .filter((url): url is string => Boolean(url)),
      public_photo_paths: undefined,
    })),
  };
}
