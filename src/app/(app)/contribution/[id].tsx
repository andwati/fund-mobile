import { router, useLocalSearchParams } from 'expo-router';

import { ContributionForm } from '@/components/contribution-form';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { useFund } from '@/fund/context';

export default function EditContribution() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payload } = useFund();
  const contribution = payload.contributions.find((entry) => entry.id === id);
  if (!contribution) {
    return (
      <Screen title="Entry" header>
        <Notice>That entry is gone.</Notice>
        <Button title="Close" variant="secondary" block onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <Screen title="Edit entry" header>
      <ContributionForm contribution={contribution} />
    </Screen>
  );
}
