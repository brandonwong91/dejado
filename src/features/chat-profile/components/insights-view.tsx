import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  getActivityHeatmapAction,
  getInsightsAction
} from '../actions/insights';
import DataControls from './data-controls';
import MirrorCard from './mirror-card';
import ProfileDrift from './profile-drift';
import ProfileStrength from './profile-strength';
import StyleFingerprintCard from './style-fingerprint';
import TopicCloud from './topic-cloud';
import TraitRadar from './trait-radar';

export default async function InsightsView() {
  const data = await getInsightsAction();

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Sign in required</CardTitle>
          <CardDescription>
            Your profile is private to your account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const heatmap = data.profilingEnabled ? await getActivityHeatmapAction() : [];

  return (
    <div className='flex flex-col gap-4'>
      <ProfileStrength data={data} />

      <TopicCloud topics={data.topics} />

      {data.profilingEnabled ? (
        <>
          <StyleFingerprintCard style={data.style} heatmap={heatmap} />

          <TraitRadar
            traits={data.traits}
            gateMet={data.confidence.gateMet}
            correctedTraits={data.correctedTraits}
          />

          <ProfileDrift drift={data.drift} />

          <MirrorCard
            enabled={data.mirrorEnabled}
            ready={data.persona.ready}
            backingMessageCount={data.persona.backingMessageCount}
          />
        </>
      ) : null}

      <DataControls profilingEnabled={data.profilingEnabled} />
    </div>
  );
}
