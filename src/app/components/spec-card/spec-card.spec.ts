import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { SpecCardComponent } from "./spec-card";

describe("SpecCardComponent", () => {
	let component: SpecCardComponent;
	let fixture: ComponentFixture<SpecCardComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SpecCardComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(SpecCardComponent);
		component = fixture.componentInstance;
		component.spec = {
			id: "1",
			title: "Test Spec",
			price: 10,
			bpm: 120,
			key: "C Major",
			duration: 200,
			tags: ["tag1"],
			imageUrl: "test-image.jpg",
			audioUrl: "test-audio.mp3",
			type: "beat",
			category: "beat",
			licenses: [],
		} as any; // Cast to any to avoid strict type checking for mock
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
