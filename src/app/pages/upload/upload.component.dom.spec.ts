import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { SpecUploadMonitorService } from '../../services/spec-upload-monitor.service';
import { SpecUploadService } from '../../services/spec-upload.service';
import { ToastService } from '../../services/toast.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent (rendered layout)', () => {
  let fixture: ComponentFixture<UploadComponent>;
  let component: UploadComponent;
  let el: HTMLElement;

  function markRequiredFilesUploaded() {
    component.uploadSessionId.set('upload-1');
    component.fileUploadStates.set({
      cover: { phase: 'uploaded', progress: 100 },
      preview: { phase: 'uploaded', progress: 100 },
      wav: { phase: 'uploaded', progress: 100 },
      stems: { phase: 'uploaded', progress: 100 },
    });
    component.previewFile.set(new File(['x'], 'p.mp3'));
    component.wavFile.set(new File(['x'], 'p.wav'));
    component.stemsFile.set(new File(['x'], 'p.zip'));
  }

  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: LabService, useValue: { notifyRefresh: vi.fn() } },
        { provide: SpecUploadMonitorService, useValue: { monitor: vi.fn() } },
        {
          provide: SpecUploadService,
          useValue: { createDraft: vi.fn(), uploadFile: vi.fn(), publishBeat: vi.fn(), completeUpload: vi.fn() },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders the page heading and the three form panels plus preview and checklist', () => {
    expect(el.querySelector('su-page-head h1')?.textContent).toContain('Press');
    const headings = Array.from(el.querySelectorAll('su-panel .panel-head h2')).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Files', 'Details', 'Licenses', 'Live preview', 'Ready to publish?']);
  });

  it('lists the three audio files, all required for a beat', () => {
    const rows = el.querySelectorAll('.file-row');
    expect(rows.length).toBe(3);
    const pills = Array.from(rows).map((row) => row.querySelector('.req')?.textContent?.trim());
    expect(pills).toEqual(['Required', 'Required', 'Required']);
    expect(el.querySelectorAll('.file-row .pick-btn')[0].textContent).toContain('Choose file');
  });

  it('marks WAV and stems optional when the upload is not a beat', () => {
    // The category is set before the first render, as the form is OnPush and reads plain form state.
    const sample = TestBed.createComponent(UploadComponent);
    sample.componentInstance.uploadForm.patchValue({ category: 'sample' });
    sample.detectChanges();
    const pills = Array.from(
      (sample.nativeElement as HTMLElement).querySelectorAll('.file-row .req'),
    ).map((p) => p.textContent?.trim());
    expect(pills).toEqual(['Required', 'Optional', 'Optional']);
    expect(sample.componentInstance.isFileRequired('wav')).toBe(false);
    expect(sample.componentInstance.isFileRequired('preview')).toBe(true);
  });

  it('shows the selected file name and lets the user remove it', () => {
    component.previewFile.set(new File(['x'], 'beat.mp3'));
    component.previewSummary.set({ name: 'beat.mp3', size: '1 MB' });
    fixture.detectChanges();

    expect(component.fileSummary('preview')).toEqual({ name: 'beat.mp3', size: '1 MB' });
    const row = el.querySelector('.file-row') as HTMLElement;
    expect(row.querySelector('.file-name')?.textContent).toContain('beat.mp3 · 1 MB');
    expect(row.querySelector('.pick-btn')?.textContent).toContain('Replace');

    (row.querySelector('.link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.previewFile()).toBeNull();
    expect(component.fileSummary('preview')).toBeNull();
    expect(el.querySelector('.file-row .link-btn')).toBeNull();
  });

  it('shows upload progress for a file slot', () => {
    component.fileUploadStates.update((states) => ({
      ...states,
      wav: { phase: 'uploading', progress: 42 },
    }));
    fixture.detectChanges();
    const transfer = el.querySelectorAll('.file-row')[1].querySelector('.transfer') as HTMLElement;
    expect(transfer.textContent).toContain('Uploading 42%');
    expect(transfer.getAttribute('data-phase')).toBe('uploading');
  });

  it('shows the cover preview and a remove action once cover art is chosen', () => {
    expect(el.querySelector('.cover-drop img')).toBeNull();
    component.coverFile.set(new File(['x'], 'c.png'));
    component.coverPreviewUrl.set('data:image/png;base64,AAAA');
    fixture.detectChanges();

    expect(el.querySelector('.cover-drop img')).not.toBeNull();
    expect(el.querySelector('.cover-overlay')?.textContent).toContain('Replace');
    (el.querySelector('.cover-copy .link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.coverFile()).toBeNull();
    expect(el.querySelector('.cover-drop img')).toBeNull();
  });

  it('toggles mood chips, tags and licenses from the form', () => {
    const chip = el.querySelector('.chips .chip') as HTMLButtonElement;
    const mood = chip.textContent?.trim() ?? '';
    const before = component.isMoodSelected(mood);
    chip.click();
    fixture.detectChanges();
    expect(component.isMoodSelected(mood)).toBe(!before);
    expect(chip.getAttribute('aria-pressed')).toBe(String(!before));

    const tagField = el.querySelector('.tag-input input') as HTMLInputElement;
    tagField.value = 'dark';
    tagField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(component.tags.length).toBe(1);
    expect(el.querySelector('.tag')?.textContent).toContain('dark');
    (el.querySelector('.tag button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.tags.length).toBe(0);

    const firstSwitch = el.querySelector('.license .switch') as HTMLButtonElement;
    const enabled = component.licenses.at(0).get('enabled')?.value;
    const priceInput = el.querySelector('.license .price input') as HTMLInputElement;
    expect(priceInput.disabled).toBe(!enabled);
    firstSwitch.click();
    fixture.detectChanges();
    expect(component.licenses.at(0).get('enabled')?.value).toBe(!enabled);
    expect(priceInput.disabled).toBe(!!enabled);
  });

  it('toggles the free MP3 download switch', () => {
    const toggle = el.querySelector('.free-row .switch') as HTMLButtonElement;
    expect(component.f['freeMp3Enabled'].value).toBe(false);
    toggle.click();
    fixture.detectChanges();
    expect(component.f['freeMp3Enabled'].value).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('reflects the draft in the live preview', () => {
    expect(el.querySelector('.preview-title')?.textContent).toContain('Untitled beat');
    component.uploadForm.patchValue({ title: 'Violet Hour', genre: 'Trap', bpm: 140 as never });
    fixture.detectChanges();
    expect(el.querySelector('.preview-title')?.textContent).toContain('Violet Hour');
    expect(el.querySelector('.preview-meta')?.textContent).toContain('140 BPM');
    expect(el.querySelectorAll('.preview-licenses li').length).toBe(component.selectedLicenses().length);
  });

  it('updates the publish checklist as requirements are met', () => {
    const items = () => Array.from(el.querySelectorAll('.checklist li'));
    expect(items().filter((li) => li.classList.contains('ok')).length).toBe(1);

    markRequiredFilesUploaded();
    component.uploadForm.patchValue({ title: 'Violet Hour', genre: 'Trap' });
    fixture.detectChanges();
    expect(items().every((li) => li.classList.contains('ok'))).toBe(true);
    expect(items()[0].textContent).toContain('3 / 3');
  });

  it('only enables Publish once the required files are uploaded, and publishes on click', () => {
    const publish = el.querySelector('.act.primary') as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    expect(el.querySelector('.sticky-footer p')?.textContent).toContain('as soon as you select them');

    markRequiredFilesUploaded();
    const submit = vi.spyOn(component, 'submitUpload').mockImplementation(() => undefined);
    const save = vi.spyOn(component, 'saveDraft').mockImplementation(() => undefined);
    fixture.detectChanges();
    expect(publish.disabled).toBe(false);
    expect(publish.textContent).toContain('Publish beat');
    expect(el.querySelector('.sticky-footer p')?.textContent).toContain('uploaded');

    publish.click();
    (el.querySelector('.act.ghost') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('exposes the audio row definitions used by the template', () => {
    expect(component.audioRows.map((row) => row.type)).toEqual(['preview', 'wav', 'stems']);
    expect(component.audioRows.every((row) => row.accept.length > 0)).toBe(true);
  });
});
