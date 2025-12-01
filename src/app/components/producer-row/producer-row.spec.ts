import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { ProducerRowComponent } from "./producer-row";

describe("ProducerRowComponent", () => {
	let component: ProducerRowComponent;
	let fixture: ComponentFixture<ProducerRowComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ProducerRowComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ProducerRowComponent);
		component = fixture.componentInstance;
		component.producer = {
			name: "Test Producer",
			specialty: "Test Genre",
			avatarUrl: "test-avatar.jpg",
		};
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
