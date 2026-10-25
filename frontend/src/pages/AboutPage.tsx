import { Fragment, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import {
    faInfoCircle,
    faKeyboard,
    faSnowflake,
    faDatabase,
    faCodeBranch,
    faListOl,
    faCode,
    faEnvelope,
    faFileContract,
    faShieldAlt,
    faHeart,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Link } from 'react-router-dom';
import { useGitHubContributors } from '../hooks/useGitHubContributors';
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

/** A translated sentence with links or keys in place of its {placeholders}, wherever its language puts them */
function withParts(sentence: string, parts: Record<string, ReactNode>): ReactNode[] {
    // Splitting on a captured group leaves the placeholders' names at the odd indexes
    return sentence.split(/\{(\w+)\}/).map((piece, i) => (i % 2 === 0 ? piece : <Fragment key={i}>{parts[piece]}</Fragment>));
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }): JSX.Element {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="about-link">
            {children}
        </a>
    );
}

export function AboutPage(): JSX.Element {
    const { t } = useLanguage();
    const { contributors, loading, error } = useGitHubContributors();
    const openMeteo = <ExternalLink href="https://open-meteo.com/">Open-Meteo</ExternalLink>;

    return (
        <div className="about-page">


            {/* About Section */}
            <Section title={t('about.title.about')} icon={faInfoCircle}>
                <p>{t('about.intro')}</p>
                <p>{t('about.features')}</p>
                <p>{t('about.track')}</p>
            </Section>

            {/* Snow Estimation Section */}
            <Section title={t('about.title.snowEstimation')} icon={faSnowflake}>
                <p>{t('about.snow.intro')}</p>
                <Subsection title={t('about.title.qualityWhenCautious')} icon={faListOl}>
                    <dl className="about-stats-list">
                        <dt>{t('about.quality.powder')}</dt>
                        <dd>- {t('about.quality.powderText')}</dd>

                        <dt>{t('about.quality.drySnow')}</dt>
                        <dd>- {t('about.quality.drySnowText')}</dd>

                        <dt>{t('about.quality.wetSnow')}</dt>
                        <dd>- {t('about.quality.wetSnowText')}</dd>

                        <dt>{t('about.quality.sleetMix')}</dt>
                        <dd>- {t('about.quality.sleetMixText')}</dd>

                        <dt>{t('about.quality.rain')}</dt>
                        <dd>- {t('about.quality.rainText')}</dd>
                    </dl>
                </Subsection>
                <Subsection title={t('about.title.snowCaution')} icon={faShieldAlt}>
                    <dl className="about-stats-list">
                        <dt>{t('about.caution.extraCautious')}</dt>
                        <dd>- {t('about.caution.extraCautiousText')}</dd>

                        <dt>{t('about.caution.cautious')}</dt>
                        <dd>- {t('about.caution.cautiousText')}</dd>

                        <dt>{t('about.caution.realistic')}</dt>
                        <dd>- {t('about.caution.realisticText')}</dd>
                    </dl>
                </Subsection>
                <p>{t('about.snow.estimates')}</p>
                <p>{t('about.snow.tie')}</p>
                <p className="about-note">{t('about.snow.note')}</p>
            </Section>

            {/* Keybinds Section */}
            <Section title={t('about.title.keybinds')} icon={faKeyboard}>
                <p>
                    {withParts(t('about.keys.palette'), {
                        esc: <kbd>{t('about.key.esc')}</kbd>,
                        tab: <kbd>{t('about.key.tab')}</kbd>,
                        ctrl: <kbd>{t('about.key.ctrl')}</kbd>,
                        shift: <kbd>{t('about.key.shift')}</kbd>,
                        p: <kbd>P</kbd>,
                    })}
                </p>
                <p>{withParts(t('about.keys.search'), { enter: <kbd>{t('about.key.enter')}</kbd> })}</p>
            </Section>

            {/* Contributors Section */}
            <Section title={t('about.title.contributors')} icon={faCodeBranch}>
                {loading && <p>{t('about.contributors.loading')}</p>}
                {error && <p>{t('about.contributors.failed')}</p>}
                {!loading && !error && contributors.length > 0 && (
                    <div className="about-contributors-grid">
                        {contributors.map((username) => (
                            <a
                                key={username}
                                href={`https://github.com/${username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="about-link"
                            >
                                {username}
                            </a>
                        ))}
                    </div>
                )}
            </Section>

            {/* Data Sources Section */}
            <Section title={t('about.title.dataSources')} icon={faDatabase}>
                <p>{withParts(t('about.data.openMeteo'), { openMeteo })}</p>
                <p>{t('about.data.models')}</p>
                <p>{t('about.data.updates')}</p>
            </Section>

            {/* Credits Section */}
            <Section title={t('about.title.credits')} icon={faCodeBranch}>
                <p>
                    {withParts(t('about.credits.inspired'), {
                        monkeytype: <ExternalLink href="https://monkeytype.com">Monkeytype</ExternalLink>,
                    })}
                </p>
                <p>{withParts(t('about.credits.weather'), { openMeteo })}</p>
                <p>
                    {withParts(t('about.credits.skiData'), {
                        openSkiData: <ExternalLink href="https://openskidata.org/">OpenSkiData</ExternalLink>,
                        osmContributors: (
                            <ExternalLink href="https://www.openstreetmap.org/copyright">{t('about.credits.osmContributors')}</ExternalLink>
                        ),
                        resortList: (
                            <ExternalLink href="https://github.com/kcluit/monkeysnow/tree/main/frontend/src/data/resorts">
                                {t('about.credits.resortList')}
                            </ExternalLink>
                        ),
                        skiMapData: (
                            <ExternalLink href="https://github.com/kcluit/monkeysnow/tree/main/frontend/public/skimap">
                                {t('about.credits.skiMapData')}
                            </ExternalLink>
                        ),
                        odbl: <ExternalLink href="https://opendatacommons.org/licenses/odbl/">ODbL</ExternalLink>,
                    })}
                </p>
                <p>
                    {withParts(t('about.credits.photos'), {
                        sources: [
                            ['EOxCloudless', 'https://cloudless.eox.at/'],
                            ['swisstopo', 'https://www.swisstopo.admin.ch/'],
                            ['IGN', 'https://geoservices.ign.fr/'],
                            ['basemap.at', 'https://basemap.at/'],
                            ['USGS', 'https://www.usgs.gov/programs/national-geospatial-program/national-map'],
                            ['GSI Japan', 'https://maps.gsi.go.jp/development/ichiran.html'],
                        ].map(([name, href], i, all) => (
                            <span key={name}>
                                {i > 0 && (i === all.length - 1 ? ` ${t('about.credits.and')} ` : t('about.credits.comma'))}
                                <ExternalLink href={href}>{name}</ExternalLink>
                            </span>
                        )),
                        mapzen: (
                            <ExternalLink href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen Terrain Tiles</ExternalLink>
                        ),
                        mapterhorn: <ExternalLink href="https://mapterhorn.com/attribution">Mapterhorn</ExternalLink>,
                    })}
                </p>
                <p>
                    {withParts(t('about.credits.icons'), {
                        fontAwesome: <ExternalLink href="https://fontawesome.com/">Font Awesome</ExternalLink>,
                    })}
                </p>
            </Section>

            {/* Contact Section */}
            <Section title={t('about.title.contact')} icon={faEnvelope}>
                <p>{t('about.contact.prompt')}</p>
                <div className="about-contact-links">
                    <a
                        href="https://github.com/kcluit/monkeysnow"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-contact-btn"
                    >
                        <Icon icon={faCode} />
                        <span>GitHub</span>
                    </a>
                    <Link to="/terms" className="about-contact-btn">
                        <Icon icon={faFileContract} />
                        <span>{t('about.contact.terms')}</span>
                    </Link>
                    <Link to="/privacy" className="about-contact-btn">
                        <Icon icon={faShieldAlt} />
                        <span>{t('about.contact.privacy')}</span>
                    </Link>
                    <a
                        href="https://ko-fi.com/kcluit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-contact-btn"
                    >
                        <Icon icon={faHeart} />
                        <span>{t('about.contact.donate')}</span>
                    </a>
                </div>
            </Section>

            {/* Hero Section */}
            <section className="about-hero">

                <p className="about-hero-subtext">
                    {t('about.madeIn')}<br />

                    {t('about.launched')}
                </p>
            </section>
        </div>
    );
}
