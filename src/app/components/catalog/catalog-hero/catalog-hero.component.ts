import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-catalog-hero',
  imports: [],
  templateUrl: './catalog-hero.component.html',
  styleUrl: './catalog-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogHeroComponent {
  readonly kind = input.required<'loops' | 'sample-packs'>();
  readonly total = input.required<number>();
  readonly producerCount = input(3204);
  readonly newThisWeek = input(480);
  readonly search = input('');
  readonly searchChange = output<string>();

  readonly copy = computed(() =>
    this.kind() === 'loops'
      ? {
          eyebrow: 'browse ✦ single loops',
          before: 'grab a ',
          accent: 'loop',
          suffix: '.',
          description:
            'One-shots and full loops from producers worldwide. Drag, drop, keep making. Filter by BPM, key, mood — find the exact vibe.',
          placeholder: 'search loops, producers, tags...',
          noun: 'loops',
        }
      : {
          eyebrow: 'browse ✦ curated crates',
          before: 'find your ',
          accent: 'pack',
          suffix: '.',
          description:
            'Complete sample packs, drum kits, melodies, and song starters from producers worldwide. Everything organized and ready to make with.',
          placeholder: 'search packs, producers, genres...',
          noun: 'packs',
        },
  );

  onSearch(event: Event) {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
