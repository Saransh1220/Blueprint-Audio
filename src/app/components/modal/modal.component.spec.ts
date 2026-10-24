import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalService } from '../../services/modal.service';
import { ModalComponent } from './modal.component';

@Component({ selector: 'app-dummy', template: '<p class="dummy">dummy</p>' })
class DummyComponent {
  a = input<number>();
}

describe('ModalComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ModalComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('exposes modal inputs from state and renders the hosted component', () => {
    const service = TestBed.inject(ModalService);
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.modalInputs).toBeUndefined();

    service.open(DummyComponent, 'My Title', { a: 1 });
    fixture.detectChanges();
    expect(fixture.componentInstance.modalInputs).toEqual({ a: 1 });
    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('My Title');
    expect(fixture.nativeElement.querySelector('.dummy')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-overlay').classList).toContain('open');
  });

  it('closes via close button, overlay click, and keeps container clicks inside', () => {
    const service = TestBed.inject(ModalService);
    const fixture = TestBed.createComponent(ModalComponent);
    service.open(DummyComponent, 'T');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.modal-container') as HTMLElement).click();
    expect(service.isOpen()).toBe(true);

    (fixture.nativeElement.querySelector('.btn-close') as HTMLElement).click();
    expect(service.isOpen()).toBe(false);
    vi.advanceTimersByTime(300);
    expect(service.state()).toBeNull();

    service.open(DummyComponent, 'T');
    (fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement).click();
    expect(service.isOpen()).toBe(false);
    fixture.componentInstance.close();
    expect(service.isOpen()).toBe(false);
  });
});
