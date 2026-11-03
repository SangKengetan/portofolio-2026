import { Router } from "express";
import type { Container } from "../container";
import type { Limiters } from "../middleware/rate-limit";
import { AchievementsController } from "../modules/achievements/achievements.controller";
import { CertificatesController } from "../modules/certificates/certificates.controller";
import { ContactController } from "../modules/contact/contact.controller";
import { ExperiencesController } from "../modules/experiences/experiences.controller";
import { GithubController } from "../modules/github/github.controller";
import { ProfileController } from "../modules/profile/profile.controller";
import { ProjectsController } from "../modules/projects/projects.controller";
import { StatsController } from "../modules/stats/stats.controller";
import { TechnologiesController } from "../modules/technologies/technologies.controller";

/** Public API (rancangan §10.1): no authentication, published content only. */
export function publicRoutes(c: Container, limiters: Limiters): Router {
  const s = c.services;
  const profile = new ProfileController(s.profile);
  const stats = new StatsController(s.stats);
  const projects = new ProjectsController(s.projects);
  const experiences = new ExperiencesController(s.experiences);
  const technologies = new TechnologiesController(s.technologies);
  const certificates = new CertificatesController(s.certificates);
  const achievements = new AchievementsController(s.achievements);
  const github = new GithubController(s.github);
  const contact = new ContactController(s.contact);

  const router = Router();
  // ETag revalidation on every request keeps responses cacheable but never stale after an edit.
  router.use((req, res, next) => {
    if (req.method === "GET") res.setHeader("Cache-Control", "public, no-cache");
    next();
  });

  router.get("/profile", profile.getPublic);
  router.get("/stats", stats.get);
  router.get("/projects", projects.listPublic);
  router.get("/projects/:slug", projects.getPublic);
  router.get("/experiences", experiences.listPublic);
  router.get("/technologies", technologies.listPublic);
  router.get("/certificates", certificates.listPublic);
  router.get("/achievements", achievements.listPublic);
  router.get("/github/contributions", github.contributions);
  router.post("/contact", limiters.contact, contact.submit);
  return router;
}
