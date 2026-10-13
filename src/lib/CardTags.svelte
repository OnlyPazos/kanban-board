<!--
  Etiquetas de una tarjeta (snippet `tags` de `Card`): el tipo como `Badge`
  con su tono e icono por defecto y, si tiene prioridad, otra `Badge` con el
  tono de D-016 y el icono de `PRIORITY_ICON` (AC-052). Compartido por el
  tablero y la vista de tarjetas archivadas (AC-056).
-->
<script lang="ts">
  import { Badge } from 'design-system';
  import { CARD_TYPE_LABELS, CARD_TYPE_TONE, PRIORITY_LABELS, PRIORITY_TONE, type Card } from '../domain';
  import { PRIORITY_ICON } from './icons';

  let { card }: { card: Card } = $props();
</script>

<Badge tone={CARD_TYPE_TONE[card.type]}>{CARD_TYPE_LABELS[card.type]}</Badge>
{#if card.priority !== null}
  <Badge tone={PRIORITY_TONE[card.priority]} icon={PRIORITY_ICON[card.priority]}>
    {PRIORITY_LABELS[card.priority]}
  </Badge>
{/if}
