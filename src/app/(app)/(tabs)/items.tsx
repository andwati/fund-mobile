import { router } from 'expo-router';
import { View } from 'react-native';

import { ItemRow } from '@/components/item-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useFund } from '@/fund/context';
import { fmtDate, money } from '@/lib/format';

export default function Items() {
  const { payload, progress, currency, canEdit, refresh, refreshing } = useFund();
  const purchased = payload.items.filter((entry) => entry.archived);

  return (
    <Screen title="Items" subtitle="What you are saving for." bottomInset={120} onRefresh={() => void refresh()} refreshing={refreshing}>
      {canEdit ? <Button title="Add item" block onPress={() => router.push('/item/new')} /> : null}

      {progress.items.length === 0 ? (
        <Card>
          <AppText variant="headline">Nothing here yet</AppText>
          <AppText tone="muted">Add what you are saving for and when you need it. Fund spreads the cost over your paydays.</AppText>
        </Card>
      ) : (
        <Card className="gap-0 py-1">
          {progress.items.map((item, i) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. Open`}
              onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              className={i > 0 ? 'border-t border-border' : ''}>
              <ItemRow item={item} currency={currency} />
            </Pressable>
          ))}
        </Card>
      )}

      {purchased.length > 0 ? (
        <View className="gap-1">
          <AppText variant="headline" className="px-1">
            Purchased
          </AppText>
          <Card className="gap-0 py-1">
            {purchased.map((item, i) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, purchased. Open`}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                className={`min-h-14 flex-row items-center justify-between gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <View className="flex-1">
                  <AppText className="font-medium" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  {item.purchasedOn ? (
                    <AppText variant="caption" tone="muted">
                      Bought {fmtDate(item.purchasedOn, true)}
                    </AppText>
                  ) : null}
                </View>
                <AppText tone="muted" numeric>
                  {money(currency, item.actualPrice ?? item.price)}
                </AppText>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
