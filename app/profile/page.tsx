import { USER } from "@/constants/user";
import { ProfileView } from "./_components/ProfileView";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <ProfileView email={USER.EMAIL} />;
}
