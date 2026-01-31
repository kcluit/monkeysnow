import { Icon } from '../components/Icon';
import { icons } from '../constants/icons';
import {
    faInfoCircle,
    faKeyboard,
    faSnowflake,
    faDatabase,
    faCodeBranch,
    faListOl,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
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

interface SubsectionProps {
    title: string;
    icon: IconDefinition;
    children: React.ReactNode;
}

function Subsection({ title, icon, children }: SubsectionProps): JSX.Element {
    return (
        <div className="about-subsection">
            <h3 className="about-subsection-title">
                <Icon icon={icon} className="about-subsection-icon" />
                {title}
            </h3>
            <div className="about-subsection-content">
                {children}
            </div>
        </div>
    );
}

export function AboutPage(): JSX.Element {
    return (
        <div className="about-page">
            {/* Hero Section */}
            <section className="about-hero">
                <p className="about-hero-text">
                    A ski resort weather forecast app for powder chasers.
                </p>
                <p className="about-hero-subtext">
                    Built with <Icon icon={icons.snow} className="text-theme-accent" /> by a passionate skier.
                </p>
            </section>

            {/* About Section */}
            <Section title="about" icon={faInfoCircle}>
                <p>
                    MonkeySnow is a minimalistic and customizable ski resort weather forecast application.
                    It displays weather data from multiple weather models for ski resorts around the world,
                    with snow accumulation estimates based on wet bulb temperature and precipitation.
                </p>
                <p>
                    The app features multiple view modes, customizable themes, multi-model comparison charts,
                    and smart snow quality estimation using meteorological algorithms.
                </p>
                <p>
                    Track conditions at your favorite resorts, compare forecasts across weather models,
                    and plan your next powder day with confidence.
                </p>
            </Section>

            {/* Snow Estimation Section */}
            <Section title="snow estimation" icon={faSnowflake}>
                <p>
                    MonkeySnow uses the Kuchera snow-to-liquid ratio method to estimate snow accumulation
                    from precipitation data. This algorithm considers wet bulb temperature to determine
                    snow density and quality.
                </p>
                <Subsection title="snow quality" icon={faListOl}>
                    <dl className="about-stats-list">
                        <dt>powder</dt>
                        <dd>
                            - light, fluffy snow with high snow-to-liquid ratios (15:1 or higher).
                            Occurs when wet bulb temperature is well below freezing.
                        </dd>

                        <dt>dry snow</dt>
                        <dd>
                            - good quality snow with moderate density (10:1 to 15:1 ratio).
                            Expected when temperatures are cold but not extreme.
                        </dd>

                        <dt>wet snow</dt>
                        <dd>
                            - heavier, wetter snow with lower ratios (5:1 to 10:1).
                            Common when temperatures are near freezing.
                        </dd>

                        <dt>sleet/mix</dt>
                        <dd>
                            - mixed precipitation when conditions hover around freezing.
                            May include rain mixed with snow.
                        </dd>

                        <dt>rain</dt>
                        <dd>
                            - liquid precipitation when wet bulb temperature is above freezing.
                        </dd>
                    </dl>
                </Subsection>
                <p className="about-note">
                    Note: These estimates are approximations. Actual snow conditions depend on many factors
                    including humidity, wind, elevation, and local terrain effects.
                </p>
            </Section>

            {/* Keybinds Section */}
            <Section title="keybinds" icon={faKeyboard}>
                <p>
                    You can use <kbd>Esc</kbd> or <kbd>Tab</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> to
                    open the command palette. From there you can access all settings and controls without touching your mouse.
                </p>
                <p>
                    The command palette supports fuzzy search - just start typing to filter commands.
                    Use arrow keys to navigate and <kbd>Enter</kbd> to select.
                </p>
            </Section>

            {/* Data Sources Section */}
            <Section title="data sources" icon={faDatabase}>
                <p>
                    Weather data is provided by{' '}
                    <a
                        href="https://open-meteo.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Open-Meteo
                    </a>
                    , an open-source weather API that aggregates data from multiple national weather services
                    and weather models worldwide.
                </p>
                <p>
                    Available weather models include ECMWF, GFS, ICON, and regional models.
                    Each model has different strengths - compare them to get a better picture of
                    expected conditions.
                </p>
                <p>
                    Forecasts are updated automatically every few hours to provide the latest predictions.
                </p>
            </Section>

            {/* Credits Section */}
            <Section title="credits" icon={faCodeBranch}>
                <p>
                    Inspired by{' '}
                    <a
                        href="https://monkeytype.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Monkeytype
                    </a>
                    {' '}- the minimalistic typing test.
                </p>
                <p>
                    Weather data by{' '}
                    <a
                        href="https://open-meteo.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Open-Meteo
                    </a>
                </p>
                <p>
                    Icons by{' '}
                    <a
                        href="https://fontawesome.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Font Awesome
                    </a>
                </p>
            </Section>

            {/* Contact Section */}
            <Section title="contact" icon={faGithub}>
                <p>
                    Found a bug? Have a feature request? Want to contribute?
                </p>
                <div className="about-contact-links">
                    <a
                        href="https://github.com/monkeysnow/monkeysnow"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-contact-btn"
                    >
                        <Icon icon={faGithub} />
                        <span>GitHub</span>
                    </a>
                </div>
            </Section>
        </div>
    );
}
