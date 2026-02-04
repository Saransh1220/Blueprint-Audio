import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
    CreateOrderRequest,
    VerifyPaymentRequest,
    GetUserLicensesRequest,
} from '../core/api/payment.requests';
import {
    Order,
    License,
    RazorpayOptions,
    RazorpayResponse,
    PaymentVerificationRequest,
} from '../models/payment';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class PaymentService {
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private auth = inject(AuthService);

    // Track active licenses
    userLicenses = signal<License[]>([]);

    /**
     * Create an order and open Razorpay checkout
     */
    initiatePayment(specId: string, licenseOptionId: string, specTitle: string): Observable<Order> {
        // Step 1: Create order on backend
        return this.api
            .execute(
                new CreateOrderRequest({
                    spec_id: specId,
                    license_option_id: licenseOptionId,
                }),
            )
            .pipe(
                tap((order) => {
                    // Step 2: Open Razorpay checkout
                    this.openRazorpayCheckout(order, specTitle);
                }),
                catchError((error) => {
                    this.toast.show('Failed to create order. Please try again.', 'error');
                    return throwError(() => error);
                }),
            );
    }

    /**
     * Open Razorpay checkout modal
     */
    private openRazorpayCheckout(order: Order, specTitle: string): void {
        const user = this.auth.currentUser();

        const options: RazorpayOptions = {
            key: environment.razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Blueprint Audio',
            description: `Purchase ${specTitle}`,
            order_id: order.razorpay_order_id!,
            prefill: {
                name: user?.name || '',
                email: user?.email || '',
            },
            theme: {
                color: '#6366f1',
            },
            handler: (response: RazorpayResponse) => {
                this.handlePaymentSuccess(order.id, response);
            },
            modal: {
                ondismiss: () => {
                    this.toast.show('Payment cancelled', 'info');
                },
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    }

    /**
     * Handle successful payment from Razorpay
     */
    private handlePaymentSuccess(orderId: string, response: RazorpayResponse): void {
        const verificationData: PaymentVerificationRequest = {
            order_id: orderId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
        };

        this.api
            .execute(new VerifyPaymentRequest(verificationData))
            .pipe(
                tap((result) => {
                    this.toast.show(result.message, 'success');
                    // Refresh user licenses
                    this.fetchUserLicenses().subscribe();
                }),
                catchError((error) => {
                    this.toast.show('Payment verification failed. Please contact support.', 'error');
                    return throwError(() => error);
                }),
            )
            .subscribe();
    }

    /**
     * Fetch user's licenses
     */
    fetchUserLicenses(): Observable<License[]> {
        return this.api.execute(new GetUserLicensesRequest()).pipe(
            tap((licenses) => {
                this.userLicenses.set(licenses);
            }),
            catchError((error) => {
                console.error('Failed to fetch licenses', error);
                return throwError(() => error);
            }),
        );
    }

    /**
     * Check if user has purchased a license for a spec
     */
    hasLicenseForSpec(specId: string): boolean {
        return this.userLicenses().some(
            (license) => license.spec_id === specId && license.is_active && !license.is_revoked,
        );
    }
}
