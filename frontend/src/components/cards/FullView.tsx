import { calculateSnowTotals } from '../../utils/weather';
import { formatSnow } from '../../utils/unitConversion';
import type { CardProps } from '../../types';
import type { CSSProperties } from 'react';

function getWeatherEmoji(condition: string): string {
  if (!condition) return '⛅';
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('snow')) return '❄️';
  if (lowerCondition.includes('rain')) return '🌧️';
  if (lowerCondition.includes('clear')) return '☀️';
  if (lowerCondition.includes('cloud')) return '☁️';
  return '⛅';
}

function getTemperatureStyle(temp: number): string {
  if (temp <= 0) {
    // For below zero temperatures, use the special color from theme
    return 'background: var(--specialColor); -webkit-background-clip: text; background-clip: text; color: transparent;';
  } else {
    // For above zero temperatures, use an exponential color transition
    // Colors: Blue (#007AFF) -> Yellow (#FFD60A) -> Orange (#FF9F0A) -> Red (#FF3B30)
    const t = Math.pow(temp / 10, 2); // Exponential curve
    let color: { r: number; g: number; b: number };

    if (t <= 0.09) { // 0-3°C: Blue to Yellow
      const normalizedT = t / 0.09;
      color = {
        r: Math.round(lerp(0, 255, normalizedT)),
        g: Math.round(lerp(122, 214, normalizedT)),
        b: Math.round(lerp(255, 10, normalizedT))
      };
    } else if (t <= 0.25) { // 3-5°C: Yellow to Orange
      const normalizedT = (t - 0.09) / 0.16;
      color = {
        r: 255,
        g: Math.round(lerp(214, 159, normalizedT)),
        b: 10
      };
    } else { // 5-10°C: Orange to Red
      const normalizedT = (t - 0.25) / 0.75;
      color = {
        r: 255,
        g: Math.round(lerp(159, 59, normalizedT)),
        b: Math.round(lerp(10, 48, normalizedT))
      };
    }

    return `color: rgb(${color.r}, ${color.g}, ${color.b})`;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

export function FullView({ resort, temperatureMetric: _temperatureMetric = 'max', showDate = false, unitSystem = 'metric' }: CardProps): JSX.Element {
  const totals = calculateSnowTotals(resort);

  return (
    <div className="resort-card rounded-3xl p-5 shadow-lg mb-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-theme-textPrimary">{resort.name}</h2>
          <p className="text-sm font-medium text-theme-accent">Base Elevation: {resort.elevation}</p>
        </div>
        <div className="text-xs font-medium text-theme-textSecondary">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <div className="min-w-[1400px]">
          <table className="w-full border-separate border-spacing-4">
            <thead>
              <tr>
                <th className="w-12"></th>
                {resort.days.map((day, dayIndex) => {
                  const pmPeriod = day.periods.find(p => p.time === 'PM');
                  const nightPeriod = day.periods.find(p => p.time === 'Night');
                  const displayCondition = pmPeriod?.condition || nightPeriod?.condition || day.weather;

                  return (
                    <th key={dayIndex} className="px-5 py-2 rounded-2xl" style={{minWidth: '280px', backgroundColor: 'var(--cardBg)'}}>
                      <div className="text-base font-bold text-theme-textPrimary flex items-center justify-center gap-2">
                        {day.name}{showDate && <span className="font-normal text-theme-textSecondary"> {day.date}</span>}
                        <span className="inline-flex items-center">{getWeatherEmoji(displayCondition)}</span>
                      </div>
                      <div className="text-xs font-semibold text-theme-textSecondary">{displayCondition}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="align-top pt-3">
                  <div className="flex flex-col gap-[42px] pl-3 pt-[60px] text-sm font-semibold text-theme-textSecondary">
                    <div>Snow</div>
                    <div>Rain</div>
                    <div>Wind</div>
                    <div>Weather</div>
                  </div>
                </td>
                {resort.days.map((day, dayIndex) => (
                  <td key={dayIndex} className="px-3 py-2">
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-4">
                        {day.periods.map((period, index) => {
                          const temp = parseInt(period.temp);
                          const tempStyle = getTemperatureStyle(temp);
                          const snowAmount = parseFloat(period.snow) || 0;
                          const snowStyle = snowAmount > 0 ? (
                            snowAmount >= 5 ?
                              'background: var(--specialColor); -webkit-background-clip: text; background-clip: text; color: transparent;' :
                              'color: var(--accent)'
                          ) : '';
                          const windSpeed = parseFloat(period.wind) || 0;

                          const tempStyleObj: CSSProperties = tempStyle.includes('background') ? {
                            background: 'var(--specialColor)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent'
                          } : {
                            color: tempStyle.split('color: ')[1]
                          };

                          const snowStyleObj: CSSProperties = snowStyle && snowAmount > 0 ? (
                            snowAmount >= 5 ? {
                              background: 'var(--specialColor)',
                              WebkitBackgroundClip: 'text',
                              backgroundClip: 'text',
                              color: 'transparent'
                            } : {
                              color: 'var(--accent)'
                            }
                          ) : {};

                          return (
                            <div
                              key={index}
                              className={`period-card p-3 rounded-2xl flex flex-col items-center text-center ${
                                day.periods.length === 1 ? 'col-span-3' :
                                day.periods.length === 2 && index === 1 ? 'col-span-2' : ''
                              }`}
                            >
                              <div className="text-sm font-bold text-theme-textPrimary mb-1">{period.time}</div>
                              <div
                                className="text-lg font-bold mb-4"
                                style={tempStyleObj}
                              >
                                {period.temp}
                              </div>
                              <div className="flex flex-col gap-[32px] text-sm w-full">
                                <div
                                  className={`font-semibold ${snowAmount === 0 ? 'text-theme-textSecondary' : ''}`}
                                  style={snowStyleObj}
                                >
                                  {period.snow}
                                </div>
                                <div className="text-theme-textSecondary font-semibold">{period.rain}</div>
                                <div className={`font-semibold ${windSpeed >= 20 ? 'text-theme-accent' : 'text-theme-textSecondary'}`}>{period.wind}</div>
                                <div className="text-theme-textSecondary font-semibold">{period.condition}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-2.5 rounded-2xl" style={{backgroundColor: 'var(--cardBg)'}}>
                        <div className="text-sm">
                          <div className="text-theme-textPrimary font-bold">Freezing Elevation: {day.freezingLevel}</div>
                          <div className={`${day.snowCondition.isRainbow ? 'rainbow-text' : 'text-theme-accent'} font-semibold mt-0.5`}>{day.snowCondition.text}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-center">
          <div className="bg-theme-cardBg px-3 py-1 rounded-lg">
            <span className="text-sm font-medium">
              <span className="text-theme-accent">Totals:</span>
              <span className="text-theme-textPrimary"> Next 3 Days: {formatSnow(totals.next3Days, unitSystem)} | Next 7 Days: {formatSnow(totals.next7Days, unitSystem)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
