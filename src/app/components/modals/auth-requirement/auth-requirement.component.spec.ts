import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModalService } from '../../../services/modal.service';
import { AuthRequirementComponent } from './auth-requirement.component';

describe('AuthRequirementComponent', () => {
  let fixture: ComponentFixture<AuthRequirementComponent>;
  let component: AuthRequirementComponent;

  const navigate = vi.fn();
  const close = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AuthRequirementComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: ModalService, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthRequirementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('navigates to login and closes modal', () => {
    component.navigateToLogin();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(close).toHaveBeenCalled();
  });

  it('wires buttons to register and login actions', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');

    (buttons[1] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/auth/register']);
    expect(close).toHaveBeenCalledTimes(1);

    (buttons[0] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(close).toHaveBeenCalledTimes(2);
  });
});
