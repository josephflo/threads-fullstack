import { fetchUser } from "@/lib/actions/user.actions";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const page = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const user = await currentUser();
  if (!user) return null;

  //user Info fetching with clerk ID
  const userInfo = await fetchUser(user.id);
  console.log(userInfo, "activity");
  if (!userInfo?.onboarded) redirect("/onboarding");


  //get activity
  

  return (
    <section>
      <h1 className="head-text mb-10">Activity</h1>
    </section>
  );
};

export default page;
