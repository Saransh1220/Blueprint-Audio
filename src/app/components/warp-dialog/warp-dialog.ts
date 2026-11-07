import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  type OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

/** Matches the exit animations in the stylesheet. */
const EXIT_MS = 360;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type WarpState = 'closed' | 'open' | 'closing';

/**
 * A full-screen dialog that opens with a "warp": red light blooms up from below and the content
 * stretches into place from a tall, narrow sliver. The shell owns the effect, the scroll lock,
 * Escape / backdrop dismissal and focus handling; the content is projected.
 */
@Component({
  selector: 'app-warp-dialog',
  templateUrl: './warp-dialog.html',
  styleUrl: './warp-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape($event)' },
})
export class WarpDialogComponent implements OnDestroy {
  readonly open = input(false);
  readonly label = input('Dialog');
  /** The user asked to dismiss (Escape or a click outside the content). The owner decides. */
  readonly dismissed = output<void>();

  readonly state = signal<WarpState>('closed');

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly shell = viewChild<ElementRef<HTMLElement>>('shell');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => this.sync(open));
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
    if (this.state() !== 'closed') this.unlock();
  }

  onEscape(event: Event): void {
    if (this.state() !== 'open') return;
    event.preventDefault();
    this.dismissed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissed.emit();
  }

  /** Keeps Tab inside the dialog (content and close button) while it is open. */
  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panel = this.panel()?.nativeElement;
    const shell = this.shell()?.nativeElement;
    if (!panel || !shell) return;
    const items = Array.from(shell.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private sync(open: boolean): void {
    this.clearTimer();
    if (open) {
      if (this.state() === 'closed') this.lock();
      this.state.set('open');
      // The panel exists after this change-detection pass.
      setTimeout(() => this.panel()?.nativeElement.focus({ preventScroll: true }));
      return;
    }
    if (this.state() === 'closed') return;
    if (this.reducedMotion()) {
      this.finish();
      return;
    }
    this.state.set('closing');
    this.timer = setTimeout(() => this.finish(), EXIT_MS);
  }

  private finish(): void {
    this.timer = null;
    this.state.set('closed');
    this.unlock();
  }

  private lock(): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlock(): void {
    document.body.style.overflow = this.previousOverflow;
    this.returnFocus?.focus?.({ preventScroll: true });
    this.returnFocus = null;
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private reducedMotion(): boolean {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
