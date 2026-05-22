import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Coin } from '../../../core/models/coin.model';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { PercentChangePipe } from '../../../shared/pipes/percent-change.pipe';

@Component({
  selector: 'app-coin-card',
  standalone: true,
  imports: [RouterLink, CompactNumberPipe, PercentChangePipe, DecimalPipe, UpperCasePipe],
  templateUrl: './coin-card.component.html',
  styleUrl: './coin-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinCardComponent {
  readonly coin = input.required<Coin>();
  readonly watched = input(false);
  readonly watchToggle = output<void>();

  scoreModifier(): string {
    const s = this.coin().investScore;
    if (s >= 70) return 'coin-card__score--high';
    if (s >= 45) return 'coin-card__score--mid';
    return 'coin-card__score--low';
  }
}
