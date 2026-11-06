import { ItemForm } from '@/components/item-form';
import { Screen } from '@/components/ui/screen';

export default function NewItem() {
  return (
    <Screen title="Add an item" header>
      <ItemForm />
    </Screen>
  );
}
