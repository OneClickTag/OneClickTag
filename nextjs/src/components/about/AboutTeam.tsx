'use client';

import { useInView } from '@/hooks/use-in-view';
import { User, Linkedin, Twitter } from 'lucide-react';

interface TeamMember {
  id?: string;
  name?: string;
  role?: string;
  bio?: string;
  imageUrl?: string;
  linkedin?: string;
  twitter?: string;
}

interface AboutTeamContent {
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  teamMembers?: TeamMember[];
  showSection?: boolean;
}

interface AboutTeamProps {
  content: AboutTeamContent;
}

export function AboutTeam({ content }: AboutTeamProps) {
  const [sectionRef, sectionInView] = useInView<HTMLElement>({ threshold: 0.25 });

  // Don't render if section is hidden
  if (content.showSection === false) {
    return null;
  }

  const members = content.teamMembers || [];

  // Don't render if no team members
  if (members.length === 0) {
    return null;
  }

  const count = members.length;
  const gridClass =
    count === 1
      ? 'grid grid-cols-1 max-w-sm mx-auto gap-8'
      : count === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto gap-8'
      : count === 3
      ? 'grid grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto gap-8'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8';

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Meet the'}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.titleHighlight || 'Team'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.subtitle || 'The people behind OneClickTag.'}
          </p>
        </div>

        {/* Team Grid */}
        <div className={gridClass}>
          {members.map((member, index) => (
            <div
              key={member.id || index}
              className={`text-center transform transition-all duration-300 ${
                sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: sectionInView ? `${150 + index * 100}ms` : '0ms',
              }}
            >
              {/* Avatar */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                <div className="absolute inset-1 bg-white rounded-full overflow-hidden">
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name || 'Team member'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name || 'Team Member'}</h3>
              <p className="text-sm text-blue-600 font-medium mb-2">{member.role || 'Role'}</p>
              {member.bio && (
                <p className="text-sm text-gray-600 mb-3">{member.bio}</p>
              )}

              {/* Social Links */}
              {(member.linkedin || member.twitter) && (
                <div className="flex justify-center gap-3">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={member.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
