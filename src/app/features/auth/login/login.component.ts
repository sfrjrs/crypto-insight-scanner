import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  async signInGoogle(): Promise<void> {
    await this.run(() => this.auth.signInWithGoogle());
  }

  async signInEmail(): Promise<void> {
    await this.run(() => this.auth.signInWithEmail(this.email, this.password));
  }

  async registerEmail(): Promise<void> {
    await this.run(() => this.auth.registerWithEmail(this.email, this.password));
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await fn();
      await this.router.navigate(['/profile']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      this.loading.set(false);
    }
  }
}
