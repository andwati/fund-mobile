import { ContributionForm } from '@/components/contribution-form';
import { Screen } from '@/components/ui/screen';

export default function NewContribution() {
  return (
    <Screen title="Log money" header>
      <ContributionForm />
    </Screen>
  );
}
