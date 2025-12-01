import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { LabSectionComponent } from "./lab-section";

describe("LabSectionComponent", () => {
	let component: LabSectionComponent;
	let fixture: ComponentFixture<LabSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LabSectionComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(LabSectionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
