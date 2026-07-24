import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SAMPLE_FILE_TYPE_LABELS, type SampleFile } from '../../../models/catalog';
import { formatCatalogDuration } from '../../../utils/catalog-format';

@Component({
  selector: 'app-sample-file-list',
  imports: [],
  templateUrl: './sample-file-list.component.html',
  styleUrl: './sample-file-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleFileListComponent {
  readonly files = input.required<readonly SampleFile[]>();
  readonly playingFileId = input<string | null>(null);
  readonly playRequested = output<string>();
  readonly downloadRequested = output<SampleFile>();

  typeLabel(file: SampleFile): string {
    return SAMPLE_FILE_TYPE_LABELS[file.fileType];
  }
  durationLabel(file: SampleFile): string {
    return formatCatalogDuration(file.durationSeconds);
  }
}
