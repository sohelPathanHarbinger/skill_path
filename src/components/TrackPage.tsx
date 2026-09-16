import { useTrack } from "../hooks/useTrack";
import { AssessmentView } from "./AssessmentView";
import { BuildingView } from "./BuildingView";
import { Dashboard } from "./Dashboard";
import { Card, Spinner } from "./ui";

export function TrackPage({ trackId }: { trackId: string }) {
  const { track, update } = useTrack(trackId);

  if (track === undefined) return <Spinner label="Loading…" />;
  if (track === null) return <NotFound what="learning track" />;

  switch (track.stage) {
    case "assessment":
      return <AssessmentView track={track} update={update} />;
    case "building":
      return <BuildingView track={track} update={update} />;
    case "learning":
      return <Dashboard track={track} update={update} />;
  }
}

export function NotFound({ what }: { what: string }) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <p className="text-slate-600">That {what} doesn't exist in this browser.</p>
      <a href="#/" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">
        ← Back to your tracks
      </a>
    </Card>
  );
}
