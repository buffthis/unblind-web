import { robot } from '@assets/images';
import { HistoryCardItem, PostCard, TechCard } from '@components/cards';
import Avatar from '@components/common/Avatar';
import Divider from '@components/common/Divider';
import Footer from '@components/common/Footer';
import HeaderNotice from '@components/common/HeaderNotice';
import HoverImage from '@components/common/HoverImage';
import Loading from '@components/common/Loading';
import { Section, SectionTitle } from '@components/common/Section';
import Header from '@components/header/Header';
import { useAuth } from '@contexts/AuthContext';
import useUser from '@hooks/useUser';
import NotFoundPage from '@pages/NotFoundPage';
import { PulseAnimation, ScrollAnimation } from '@styles/AnimationStyles';
import { CardList } from '@styles/compositions/Card.styles';
import {
  Period,
  ProjectCard,
  ProjectContent,
  ProjectDescription,
  ProjectImageContainer,
  ProjectList,
  ProjectTitle,
} from '@styles/compositions/Project.styles';
import { AboutContent, TextContent } from '@styles/compositions/Section.styles';
import { SkillCardList } from '@styles/compositions/Skill.styles';
import isEmpty from '@utils/isEmpty';
import { serializeJsonLd } from '@utils/jsonLd';
import { sectionConfig } from '@utils/sections';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { POST_EDITOR_ENABLED, SITE_NAME, SITE_URL } from '@/config';

export default function UserPage() {
  const { username } = useParams();
  const { user, loading, error } = useUser(username);
  const { user: me } = useAuth();
  const isMe =
    POST_EDITOR_ENABLED &&
    me?.username != null &&
    me.username === user?.username;

  if (loading) return <Loading />;

  // 캐시된 프로필이 있는 상태에서 백그라운드 refetch만 실패한 경우에는
  // 데이터를 그대로 보여주고, 데이터 자체가 없을 때만 NotFound를 렌더링한다.
  if (error && !user.id) {
    return (
      <NotFoundPage
        title="사용자를 찾을 수 없습니다"
        message={`'${username}' 사용자가 존재하지 않거나 정보를 불러올 수 없습니다.`}
      />
    );
  }

  const sectionVisibility = {};
  sectionConfig.forEach((section) => {
    sectionVisibility[section.id] =
      section.always || !isEmpty(user[section.key]);
  });

  const profileJsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: user.name,
      alternateName: username,
      url: `${SITE_URL}/${username}`,
      description: user.bio || '',
      image: {
        '@type': 'ImageObject',
        url: user.profileImage?.url || '',
      },
    },
  });

  const breadcrumbJsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Users',
        item: `${SITE_URL}/users`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: user.name,
        item: `${SITE_URL}/${username}`,
      },
    ],
  });

  return (
    <>
      <Helmet>
        <title>{`${user.name} (@${username}) | ${SITE_NAME}`}</title>
        <meta name="description" content={user.bio || ''} />
        <script type="application/ld+json">{profileJsonLd}</script>
        <script type="application/ld+json">{breadcrumbJsonLd}</script>
      </Helmet>

      <Header sectionVisibility={sectionVisibility} />

      {user.userType === 'ADMIN' && (
        <HeaderNotice type="info" message="This user is an admin." />
      )}
      {user.userType === 'TEST' && (
        <HeaderNotice
          type="warning"
          message="This user is a bot."
          icon={robot}
        />
      )}

      <Section id="about" colorScheme="light">
        <AboutContent>
          <ScrollAnimation delay={0.2}>
            <PulseAnimation>
              <Avatar
                src={user.profileImage?.url}
                alt={user.profileImage?.altText || 'Profile'}
                size={200}
              />
            </PulseAnimation>
          </ScrollAnimation>

          <ScrollAnimation delay={0.4}>
            <TextContent>
              <p>{user.name}</p>
            </TextContent>
          </ScrollAnimation>

          <ScrollAnimation delay={0.6}>
            <TextContent>
              <small>{user.bio}</small>
            </TextContent>
          </ScrollAnimation>
        </AboutContent>
      </Section>

      <Divider visible={sectionVisibility.history} />
      <Section id="history" visible={sectionVisibility.history}>
        <SectionTitle id="history-title">
          <ScrollAnimation>History</ScrollAnimation>
        </SectionTitle>

        <CardList>
          {user.careers.map((career, index) => (
            <ScrollAnimation key={career.id ?? index} delay={0.3}>
              <HistoryCardItem {...career} />
            </ScrollAnimation>
          ))}
        </CardList>
      </Section>

      <Divider visible={sectionVisibility.skills} />
      <Section id="skills" visible={sectionVisibility.skills}>
        <SectionTitle id="skills-title">
          <ScrollAnimation>Skills</ScrollAnimation>
        </SectionTitle>

        <SkillCardList>
          {user.skills.map((skill, index) => (
            <ScrollAnimation key={skill.id ?? index} delay={0.3}>
              <TechCard
                url={skill.tool.logo.url}
                name={skill.tool.name}
                level={skill.level}
              />
            </ScrollAnimation>
          ))}
        </SkillCardList>
      </Section>

      <Divider visible={sectionVisibility.projects} />
      <Section id="projects" visible={sectionVisibility.projects}>
        <SectionTitle id="projects-title">
          <ScrollAnimation>Projects</ScrollAnimation>
        </SectionTitle>

        <ProjectList>
          {user.projects.map((project, index) => (
            <ProjectCard key={project.id ?? index}>
              <ScrollAnimation delay={0.3}>
                <ProjectImageContainer>
                  <HoverImage
                    baseImage={project.thumbnail?.url}
                    alt={project.title}
                    link={project.externalUrl}
                    showButton={false}
                  />
                </ProjectImageContainer>
                <ProjectContent>
                  <ProjectTitle>{project.title}</ProjectTitle>
                  <ProjectDescription>{project.subtitle}</ProjectDescription>
                  <Period>{project.startDate}</Period>
                </ProjectContent>
              </ScrollAnimation>
            </ProjectCard>
          ))}
        </ProjectList>
      </Section>

      <Divider visible={sectionVisibility.posts} />
      <Section id="posts" visible={sectionVisibility.posts}>
        <SectionTitle id="posts-title">
          <ScrollAnimation>Posts</ScrollAnimation>
        </SectionTitle>
        {isMe && <Link to="/posts/new">글쓰기</Link>}

        <ProjectList>
          {user.posts.map((post, index) => (
            <ScrollAnimation key={post.id ?? index} delay={0.3}>
              <PostCard post={post} />
            </ScrollAnimation>
          ))}
        </ProjectList>
      </Section>

      <Footer />
    </>
  );
}
