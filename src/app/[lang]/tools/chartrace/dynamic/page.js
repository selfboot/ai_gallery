import Link from 'next/link';
import { dynamicChartConfigs } from '../dynamicChartConfigs';

export default function DynamicChartsIndex() {
  return (
    <div>
      <h1>Dynamic Charts</h1>
      <ul>
        {dynamicChartConfigs.map((config) => (
          <li key={config.id}>
            <Link href={`/tools/chartrace/dynamic/${config.id}`}>
              {config.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
