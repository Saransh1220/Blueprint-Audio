import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MusicalKey } from '../../models';
import { SpecFormComponent } from './spec-form.component';

describe('SpecFormComponent', () => {
  let fixture: ComponentFixture<SpecFormComponent>;
  let component: SpecFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes licenses and handles tags', () => {
    expect(component.licenses.length).toBe(4);

    component.addTag({ target: { value: 'x' } } as any);
    component.addTag({ target: { value: 'y' } } as any);
    component.addTag({ target: { value: 'z' } } as any);
    component.addTag({ target: { value: 'w' } } as any);
    expect(component.tags.length).toBe(3);

    component.removeTag(0);
    expect(component.tags.length).toBe(2);
  });

  it('loads initial data and supports file selection', () => {
    fixture.componentRef.setInput('initialData', {
      title: 'Beat',
      category: 'beat',
      genres: [{ id: 'g1', name: 'TRAP', slug: 'trap' }],
      bpm: 120,
      key: MusicalKey.A_MINOR,
      tags: ['dark'],
      licenses: [
        { type: 'Basic', name: 'Basic', price: 1000, features: ['x'], fileTypes: ['MP3'] },
      ],
    });
    fixture.detectChanges();

    expect(component.specForm.value.title).toBe('Beat');
    expect(component.tags.length).toBe(1);
    expect(component.licenses.length).toBe(1);

    const file = new File(['a'], 'f.wav', { type: 'audio/wav' });
    component.onFileSelected({ target: { files: [file] } } as any, 'wav');
    expect(component.wavFile()?.name).toBe('f.wav');
  });

  it('emits submit/cancel and supports helper getters', () => {
    const submitSpy = vi.fn();
    const cancelSpy = vi.fn();
    component.formSubmit.subscribe(submitSpy);
    component.formCancel.subscribe(cancelSpy);

    component.onSubmit();
    expect(submitSpy).not.toHaveBeenCalled();

    component.specForm.patchValue({ title: 'Title', category: 'beat', genre: 'TRAP', bpm: 120 });
    component.onSubmit();
    expect(submitSpy).toHaveBeenCalled();

    component.onCancel();
    expect(cancelSpy).toHaveBeenCalled();

    expect(component.getLicenseGroup(0)).toBeTruthy();
    expect(component.isCreateMode()).toBe(true);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();
    expect(component.isCreateMode()).toBe(false);
  });
});
