import { Icon } from '../components/Icon';
import {
    faFileContract,
    faUserShield,
    faExclamationTriangle,
    faHandshake,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

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

export function TermsPage(): JSX.Element {
    return (
        <div className="about-page">
            <Section title="terms of use" icon={faFileContract}>
                <p>
                    By accessing and using monkeysnow, you agree to be bound by these terms of use.
                    If you do not agree with any part of these terms, please do not use the application.
                </p>
            </Section>

            <Section title="use of the service" icon={faHandshake}>
                <p>
                    monkeysnow is a free, open-source weather forecast application for ski resorts.
                    The service is provided "as is" without warranty of any kind, express or implied.
                </p>
                <p>
                    You may use this service for personal, non-commercial purposes. You agree not to
                    misuse the service or interfere with its normal operation.
                </p>
            </Section>

            <Section title="disclaimer" icon={faExclamationTriangle}>
                <p>
                    Weather forecasts and snow estimates are approximations based on data from third-party
                    weather models. They should not be relied upon as the sole source of information for
                    safety-critical decisions.
                </p>
                <p>
                    Always check official resort conditions and avalanche advisories before heading to the mountains.
                    We are not responsible for any decisions made based on the data displayed in this application.
                </p>
            </Section>

            <Section title="your responsibilities" icon={faUserShield}>
                <p>
                    You are responsible for your own safety when participating in snow sports.
                    Use forecast data as one of many tools in your decision-making process.
                </p>
                <p>
                    These terms may be updated from time to time. Continued use of the service after
                    changes constitutes acceptance of the updated terms.
                </p>
            </Section>
        </div>
    );
}
