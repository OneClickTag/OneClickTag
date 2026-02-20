import { Shield, BarChart3, Megaphone, SlidersHorizontal, Cog } from 'lucide-react';

interface CookieItem {
  id: string;
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type: string | null;
}

interface CookieCategoryData {
  id: string;
  name: string;
  description: string;
  category: string;
  isRequired: boolean;
  cookies: CookieItem[];
}

interface CookieInventoryProps {
  categories: CookieCategoryData[];
}

const categoryIcons: Record<string, typeof Shield> = {
  NECESSARY: Shield,
  ANALYTICS: BarChart3,
  MARKETING: Megaphone,
  PREFERENCES: SlidersHorizontal,
  FUNCTIONAL: Cog,
};

const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
  NECESSARY: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  ANALYTICS: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  MARKETING: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  PREFERENCES: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  FUNCTIONAL: { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
};

function buildCategorySummary(categories: CookieCategoryData[]): string {
  const names = categories.map((c) =>
    c.name.toLowerCase().replace(/\s*cookies?\s*$/i, '').trim()
  );
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function CookieInventory({ categories }: CookieInventoryProps) {
  if (categories.length === 0) return null;

  // Sort: NECESSARY first, then alphabetical
  const sorted = [...categories].sort((a, b) => {
    if (a.category === 'NECESSARY') return -1;
    if (b.category === 'NECESSARY') return 1;
    return a.name.localeCompare(b.name);
  });

  const summary = buildCategorySummary(sorted);

  return (
    <div className="border-t border-gray-200 pt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Cookies We Use
      </h2>
      <p className="text-gray-600 mb-3">
        This site uses <strong className="text-gray-700">{summary}</strong> cookies.
      </p>
      <p className="text-gray-600 mb-8">
        Below is a detailed list of the cookies used on our website, organized by category.
      </p>

      <div className="space-y-6">
        {sorted.map((category) => {
          const Icon = categoryIcons[category.category] || Shield;
          const colors = categoryColors[category.category] || categoryColors.FUNCTIONAL;

          return (
            <div
              key={category.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Category header */}
              <div className={`${colors.bg} px-4 sm:px-6 py-4 flex items-start sm:items-center justify-between gap-3`}>
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5 sm:mt-0`} />
                  <div className="min-w-0">
                    <h3 className={`font-semibold ${colors.text}`}>
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {category.isRequired ? (
                    <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full whitespace-nowrap">
                      Always Active
                    </span>
                  ) : (
                    <span className={`text-xs font-medium ${colors.badge} px-2 py-1 rounded-full whitespace-nowrap`}>
                      Optional
                    </span>
                  )}
                </div>
              </div>

              {/* Cookie table */}
              {category.cookies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                          Cookie
                        </th>
                        <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                          Provider
                        </th>
                        <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                          Purpose
                        </th>
                        <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {category.cookies.map((cookie) => (
                        <tr key={cookie.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3">
                            <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 break-all">
                              {cookie.name}
                            </code>
                            {/* Show provider/purpose on mobile as extra lines */}
                            <div className="sm:hidden mt-1 text-xs text-gray-500">
                              {cookie.provider}
                            </div>
                            <div className="md:hidden sm:block hidden mt-1 text-xs text-gray-500">
                              {/* Provider shows on sm but not md+ */}
                            </div>
                            <div className="md:hidden mt-0.5 text-xs text-gray-500 line-clamp-2">
                              {cookie.purpose}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 hidden sm:table-cell">
                            {cookie.provider}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 hidden md:table-cell">
                            {cookie.purpose}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 whitespace-nowrap">
                            {cookie.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 sm:px-6 py-4 text-sm text-gray-500 italic">
                  No individual cookies configured for this category.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
