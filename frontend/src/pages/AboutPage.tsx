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
    const { contributors, loading, error } = useGitHubContributors();

    return (
        <div className="about-page">


            {/* About Section */}
            <Section title="about" icon={faInfoCircle}>
                <p>
                    monkeysnow is a minimalistic and customizable ski resort/snow forecast app.
                    It displays weather data from multiple weather models for ski resorts around the world,
                    with snow accumulation estimates based on wet bulb temperature and precipitation.
                </p>
                <p>
                    The app features multiple view modes, customizable themes, and multi-model comparison charts.
                </p>
                <p>
                    Track conditions at your favorite resorts and compare forecasts across weather models.
                </p>
            </Section>

            {/* Snow Estimation Section */}
            <Section title="snow estimation" icon={faSnowflake}>
                <p>
                    monkeysnow estimates what falls from each hour's temperature and humidity at the height
                    being forecast, through the wet-bulb temperature: how cold the air would get if its moisture
                    evaporated into it, which tells rain from snow better than the air temperature alone.
                    How far it leans toward the worse label when an hour is close is your snow caution,
                    set on the settings page: cautious unless you pick another.
                </p>
                <Subsection title="snow quality, when cautious" icon={faListOl}>
                    <dl className="about-stats-list">
                        <dt>powder</dt>
                        <dd>
                            - light, fluffy snow, 15 cm or more for every centimetre of water.
                            Wet bulb from about −11 °C down to about −21 °C.
                        </dd>

                        <dt>dry snow</dt>
                        <dd>
                            - good snow of ordinary density, 10 to 15 cm for every centimetre of water.
                            Wet bulb from about −3.5 °C down to −11 °C, and again below −21 °C, where crystals go small.
                        </dd>

                        <dt>wet snow</dt>
                        <dd>
                            - heavy snow, under 10 cm for every centimetre of water.
                            Wet bulb from −0.5 °C down to about −3.5 °C.
                        </dd>

                        <dt>sleet/mix</dt>
                        <dd>
                            - snow and rain together, counted partly as each.
                            Wet bulb between −0.5 °C and +0.5 °C, where snow is still the likelier but not near-certain.
                        </dd>

                        <dt>rain</dt>
                        <dd>
                            - wet bulb of +0.5 °C and above.
                        </dd>
                    </dl>
                </Subsection>
                <Subsection title="snow caution" icon={faShieldAlt}>
                    <dl className="about-stats-list">
                        <dt>extra cautious</dt>
                        <dd>
                            - rain from a wet bulb of −0.3 °C and sleet/mix from −1.5 °C, so rain wherever there's
                            even a 1 in 10 chance of it. Its snow is denser too, as LaChapelle measured it at Alta,
                            so down to a wet bulb of about −6 °C the same water makes 10 to 15% less of it.
                        </dd>

                        <dt>cautious</dt>
                        <dd>
                            - the labels above: rain from +0.5 °C, where snow is still about 2 in 3 likely.
                        </dd>

                        <dt>realistic</dt>
                        <dd>
                            - rain from +1.35 °C and sleet/mix from +0.25 °C, so half snow at +0.8 °C,
                            where the rain–snow studies put it in the mountains.
                        </dd>
                    </dl>
                </Subsection>
                <p>
                    The "monkeysnow estimate" on a card, shown unless you pick the "Model estimate", splits each
                    hour's total precipitation into snow and rain this way, for each elevation on its own, and turns
                    the snow's water into centimetres with a snow-to-liquid ratio that rises from 8 near freezing to
                    17 at −14 °C and falls again in the bitter cold. The "Model estimate" shows the weather model's
                    own snowfall and rain instead, which it works out for its grid cell rather than for each elevation.
                </p>
                <p>
                    A period's or a day's snow quality is the one under which most of its precipitation fell;
                    on a tie, the worse one.
                </p>
                <p className="about-note">
                    Note: These estimates are approximations. Actual snow conditions depend on many factors
                    including wind, elevation and local terrain effects, and on the weather model being right.
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

            {/* Contributors Section */}
            <Section title="contributors" icon={faCodeBranch}>
                {loading && <p>loading contributors...</p>}
                {error && <p>failed to load contributors.</p>}
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
                    Ski resort, run and lift data from{' '}
                    <a
                        href="https://openskidata.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        OpenSkiData
                    </a>
                    {' '}/ OpenSkiMap.org, ©{' '}
                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        OpenStreetMap contributors
                    </a>
                    {' '}(ODbL), Skimap.org, Who's On First, © Mapterhorn. Our{' '}
                    <a
                        href="https://github.com/kcluit/monkeysnow/tree/main/frontend/src/data/resorts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        resort list
                    </a>
                    {' '}and{' '}
                    <a
                        href="https://github.com/kcluit/monkeysnow/tree/main/frontend/public/skimap"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        ski map data
                    </a>
                    {' '}are available under the{' '}
                    <a
                        href="https://opendatacommons.org/licenses/odbl/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        ODbL
                    </a>
                    .
                </p>
                <p>
                    Map satellite photos from{' '}
                    {[
                        ['EOxCloudless', 'https://cloudless.eox.at/'],
                        ['swisstopo', 'https://www.swisstopo.admin.ch/'],
                        ['IGN', 'https://geoservices.ign.fr/'],
                        ['basemap.at', 'https://basemap.at/'],
                        ['USGS', 'https://www.usgs.gov/programs/national-geospatial-program/national-map'],
                        ['GSI Japan', 'https://maps.gsi.go.jp/development/ichiran.html'],
                    ].map(([name, href], i, all) => (
                        <span key={name}>
                            {i > 0 && (i === all.length - 1 ? ' and ' : ', ')}
                            <a href={href} target="_blank" rel="noopener noreferrer" className="about-link">{name}</a>
                        </span>
                    ))}
                    ; terrain from{' '}
                    <a
                        href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Mapzen Terrain Tiles
                    </a>
                    {' '}and, on the 3D map,{' '}
                    <a
                        href="https://mapterhorn.com/attribution"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-link"
                    >
                        Mapterhorn
                    </a>
                    .
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
            <Section title="contact" icon={faEnvelope}>
                <p>
                    Found a bug? Have a feature request? Want to contribute?
                </p>
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
                        <span>Terms</span>
                    </Link>
                    <Link to="/privacy" className="about-contact-btn">
                        <Icon icon={faShieldAlt} />
                        <span>Privacy</span>
                    </Link>
                    <a
                        href="https://ko-fi.com/kcluit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-contact-btn"
                    >
                        <Icon icon={faHeart} />
                        <span>Donate</span>
                    </a>
                </div>
            </Section>

            {/* Hero Section */}
            <section className="about-hero">

                <p className="about-hero-subtext">
                    Made in Burnaby with love.<br />

                    Launched on 30th Jan 2026.
                </p>
            </section>
        </div>
    );
}
