import { useQuery } from '@tanstack/react-query';

import { call, client } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useUser } from '@/auth/session';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';

export default function Overview() {
  const user = useUser();
  const funds = useQuery({ queryKey: ['funds'], queryFn: () => call(client.GET('/funds')) });

  return (
    <Screen title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Your funds will show up here." bottomInset={120}>
      {funds.isError ? <Notice kind="error">{errorMessage(funds.error)}</Notice> : null}
      {funds.data?.funds.map((f) => (
        <Card key={f.id}>
          <AppText variant="headline">{f.name}</AppText>
          <AppText variant="caption" tone="muted">
            {f.role}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}
