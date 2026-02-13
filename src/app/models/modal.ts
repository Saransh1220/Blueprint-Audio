import type { Type } from '@angular/core';

export interface ModalData {
  component: Type<unknown>;
  title?: string;
  data?: Record<string, unknown>;
  width?: string;
  height?: string;
}
