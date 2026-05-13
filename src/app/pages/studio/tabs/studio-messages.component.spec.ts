import { TestBed } from '@angular/core/testing';
import { StudioMessagesComponent } from './studio-messages.component';

describe('StudioMessagesComponent', () => {
  it('creates the messages tab component', () => {
    TestBed.configureTestingModule({});

    const component = TestBed.runInInjectionContext(() => new StudioMessagesComponent());

    expect(component).toBeTruthy();
  });
});
