import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'percentChange', standalone: true })
export class PercentChangePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}
