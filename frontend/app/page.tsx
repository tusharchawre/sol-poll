import Navbar from "./components/Navbar";
import PollCard from "./components/PollCard";
import CreatePollForm from "./components/CreatePollForm";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center ">
      <div className="w-full max-w-7xl">
        <Navbar />
      </div>

      <div className="w-full max-w-7xl flex items-center justify-center gap-4 flex-wrap mt-10">
        <PollCard
          title="Sample Poll"
          description="This is a sample poll to demonstrate the PollCard component functionality."
          endsAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          className="w-full max-w-md bg-[#0A0A0A] rounded-xl p-4 border border-[#262626] "
        />
        <PollCard
          title="Sample Poll"
          description="This is a sample poll to demonstrate the PollCard component functionality."
          endsAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          className="w-full max-w-md bg-[#0A0A0A] rounded-xl p-4 border border-[#262626] "
        />
        <PollCard
          title="Sample Poll"
          description="This is a sample poll to demonstrate the PollCard component functionality."
          endsAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          className="w-full max-w-md bg-[#0A0A0A] rounded-xl p-4 border border-[#262626] "
        />
        <PollCard
          title="Sample Poll"
          description="This is a sample poll to demonstrate the PollCard component functionality."
          endsAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          className="w-full max-w-md bg-[#0A0A0A] rounded-xl p-4 border border-[#262626] "
        />
      </div>

      <div className="w-full max-w-7xl mt-10 ">
        <CreatePollForm />
      </div>


    </div>
  );
}
