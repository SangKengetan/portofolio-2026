import type { AppConfig } from "./config/env";
import { createDb, type Db } from "./db/client";
import { TtlCache } from "./lib/cache";
import { InMemoryJobQueue, type JobQueue } from "./lib/jobs";
import { createLogger, type Logger } from "./lib/logger";
import { createMailer, type Mailer } from "./lib/mailer";
import { createMediaUrlBuilder } from "./lib/media-url";
import { ContentPublisher } from "./lib/publisher";
import { LocalStorage, type Storage } from "./lib/storage";
import { AchievementsRepository } from "./modules/achievements/achievements.repository";
import { AchievementsService } from "./modules/achievements/achievements.service";
import { KyselyAuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { Argon2Hasher, type PasswordHasher } from "./modules/auth/password";
import { CertificatesRepository } from "./modules/certificates/certificates.repository";
import { CertificatesService } from "./modules/certificates/certificates.service";
import { KyselyContactRepository } from "./modules/contact/contact.repository";
import { ContactService } from "./modules/contact/contact.service";
import { DashboardService } from "./modules/dashboard/dashboard.service";
import { ExperiencesRepository } from "./modules/experiences/experiences.repository";
import { ExperiencesService } from "./modules/experiences/experiences.service";
import { GithubService } from "./modules/github/github.service";
import { MediaLookup } from "./modules/media/media.mapper";
import { MediaRepository } from "./modules/media/media.repository";
import { MediaService } from "./modules/media/media.service";
import { MessagesService } from "./modules/messages/messages.service";
import { ProfileRepository } from "./modules/profile/profile.repository";
import { ProfileService } from "./modules/profile/profile.service";
import { ProjectsRepository } from "./modules/projects/projects.repository";
import { ProjectsService } from "./modules/projects/projects.service";
import { StatsService } from "./modules/stats/stats.service";
import { TechnologiesRepository } from "./modules/technologies/technologies.repository";
import { TechnologiesService } from "./modules/technologies/technologies.service";

/** Everything that talks to the outside world can be swapped in tests. */
export interface Overrides {
  logger?: Logger;
  mailer?: Mailer;
  hasher?: PasswordHasher;
  jobs?: JobQueue;
  storage?: Storage;
  fetchFn?: typeof fetch;
  now?: () => Date;
}

/**
 * Composition root: the ONLY place where concrete classes are wired together.
 * Controllers/services receive their dependencies through constructors, so unit tests can pass fakes.
 */
export function buildContainer(config: AppConfig, overrides: Overrides = {}) {
  const logger = overrides.logger ?? createLogger(config.logLevel, !config.isProd && config.nodeEnv !== "test");
  const { db, pool } = createDb(config.databaseUrl, config.dbPoolMax);
  const now = overrides.now ?? (() => new Date());

  const cache = new TtlCache(60_000);
  const jobs = overrides.jobs ?? new InMemoryJobQueue(logger);
  const mailer = overrides.mailer ?? createMailer(config.mail, logger);
  const storage = overrides.storage ?? new LocalStorage(config.uploadDir);
  const mediaUrl = createMediaUrlBuilder(config.mediaPublicUrl);
  const publisher = new ContentPublisher({ cache, jobs, config: config.revalidate, log: logger, fetchFn: overrides.fetchFn });

  // repositories
  const mediaRepo = new MediaRepository(db);
  const techRepo = new TechnologiesRepository(db);
  const projectsRepo = new ProjectsRepository(db);
  const experiencesRepo = new ExperiencesRepository(db);
  const certificatesRepo = new CertificatesRepository(db);
  const achievementsRepo = new AchievementsRepository(db);
  const profileRepo = new ProfileRepository(db);
  const contactRepo = new KyselyContactRepository(db);
  const mediaLookup = new MediaLookup(mediaRepo, mediaUrl);

  // services
  const auth = new AuthService(
    new KyselyAuthRepository(db),
    overrides.hasher ?? new Argon2Hasher(),
    {
      jwtSecret: config.auth.jwtSecret,
      accessTtlMinutes: config.auth.accessTtlMinutes,
      refreshTtlDays: config.auth.refreshTtlDays,
      ipHashSecret: config.ipHashSecret,
    },
    now,
  );

  const services = {
    auth,
    profile: new ProfileService(profileRepo, mediaRepo, mediaLookup, mediaUrl, publisher, cache),
    stats: new StatsService(projectsRepo, experiencesRepo, certificatesRepo, achievementsRepo, cache, now),
    projects: new ProjectsService(projectsRepo, techRepo, mediaRepo, mediaLookup, publisher, cache, now),
    experiences: new ExperiencesService(experiencesRepo, techRepo, mediaRepo, mediaLookup, publisher, cache, now),
    technologies: new TechnologiesService(techRepo, publisher, cache),
    certificates: new CertificatesService(certificatesRepo, mediaRepo, mediaLookup, publisher, cache, now),
    achievements: new AchievementsService(achievementsRepo, mediaRepo, mediaLookup, publisher, cache, now),
    media: new MediaService(mediaRepo, storage, mediaUrl, publisher, now),
    contact: new ContactService(contactRepo, jobs, mailer, logger, {
      ipHashSecret: config.ipHashSecret,
      notifyTo: config.mail.notifyTo,
    }),
    messages: new MessagesService(contactRepo),
    github: new GithubService(config.github, logger, overrides.fetchFn),
    dashboard: new DashboardService(db),
  };

  return {
    config,
    logger,
    db: db as Db,
    pool,
    cache,
    jobs,
    services,
    /** Graceful shutdown: let background jobs finish, then close the pool. */
    async close() {
      await jobs.drain(5000);
      await db.destroy();
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
