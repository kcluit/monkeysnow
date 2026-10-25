import { Icon } from '../components/Icon';
import {
    faShieldAlt,
    faDatabase,
    faCookieBite,
    faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useLanguage } from '../hooks/useLanguage';

interface SectionProps {
    title: string;
    icon: IconDefinition;
    children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps): JSX.Element {
    return (
        <section className="about-section">
            <h2 className="about-section-title">
                <Icon icon={icon} className="about-section-icon" />
                {title}
            </h2>
            <div className="about-section-content">
                {children}
            </div>
        </section>
    );
}

export function PrivacyPage(): JSX.Element {
    const { t, language } = useLanguage();
    // The policy stays in English, the binding version; another language only says so, above it
    return (
        <div className="about-page" lang="en">
            {language.id !== 'en' && (
                <p className="about-note" lang={language.id} style={{ marginTop: 0 }}>{t('legal.privacyEnglishOnly')}</p>
            )}
            <Section title="privacy policy" icon={faShieldAlt}>
                <p>
                    Your privacy is important to us. This policy explains what information monkeysnow
                    collects and how it is used.
                </p>
            </Section>

            <Section title="data collection" icon={faDatabase}>
                <p>
                    monkeysnow stores your preferences (selected resorts, theme, view mode, and other settings)
                    locally in your browser using localStorage. This data never leaves your device.
                </p>
                <p>
                    We do not collect, store, or transmit any personal information. There are no user accounts,
                    no tracking pixels, and no analytics scripts.
                </p>
            </Section>

            <Section title="cookies" icon={faCookieBite}>
                <p>
                    monkeysnow does not use cookies. All preferences are stored via browser localStorage,
                    which is not shared with any server or third party.
                </p>
            </Section>

            <Section title="third-party services" icon={faGlobe}>
                <p>
                    Weather data is fetched from{' '}
                    <a
                        href="https://open-meteo.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Open-Meteo
                    </a>
                    . Contributor information is fetched from the GitHub API.
                    Please refer to their respective privacy policies for details on how they handle requests.
                </p>
                <p>
                    We do not share any user data with these services beyond the standard HTTP requests
                    required to fetch weather forecasts and contributor lists.
                </p>
            </Section>
        </div>
    );
}
