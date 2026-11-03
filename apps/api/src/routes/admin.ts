import { Router } from "express";
import type { Container } from "../container";
import { originGuard } from "../middleware/origin-guard";
import type { Limiters } from "../middleware/rate-limit";
import { requireAdmin } from "../middleware/require-admin";
import { uploadSingle } from "../middleware/upload";
import { AchievementsController } from "../modules/achievements/achievements.controller";
import { AuthController } from "../modules/auth/auth.controller";
import { CertificatesController } from "../modules/certificates/certificates.controller";
import { DashboardController } from "../modules/dashboard/dashboard.controller";
import { ExperiencesController } from "../modules/experiences/experiences.controller";
import { MediaController } from "../modules/media/media.controller";
import { MessagesController } from "../modules/messages/messages.controller";
import { ProfileController } from "../modules/profile/profile.controller";
import { ProjectsController } from "../modules/projects/projects.controller";
import { TechnologiesController } from "../modules/technologies/technologies.controller";

/** POST /auth/* — login, refresh, logout, me, change-password (rancangan §10.2). */
export function authRoutes(c: Container, limiters: Limiters): Router {
  const auth = new AuthController(c.services.auth, c.config.auth);
  const guard = requireAdmin(c.services.auth);
  const router = Router();
  router.use(originGuard(c.config.csrfOrigins));
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.post("/login", limiters.login, auth.login);
  router.post("/refresh", limiters.refresh, auth.refresh);
  router.post("/logout", auth.logout);
  router.get("/me", guard, auth.me);
  router.post("/change-password", limiters.login, guard, auth.changePassword);
  return router;
}

/** Everything under /admin requires a valid session cookie. */
export function adminRoutes(c: Container, limiters: Limiters): Router {
  const s = c.services;
  const router = Router();
  router.use(originGuard(c.config.csrfOrigins));
  router.use(requireAdmin(s.auth));

  const profile = new ProfileController(s.profile);
  const projects = new ProjectsController(s.projects);
  const experiences = new ExperiencesController(s.experiences);
  const technologies = new TechnologiesController(s.technologies);
  const certificates = new CertificatesController(s.certificates);
  const achievements = new AchievementsController(s.achievements);
  const media = new MediaController(s.media);
  const messages = new MessagesController(s.messages);
  const dashboard = new DashboardController(s.dashboard);

  router.get("/dashboard", dashboard.summary);

  router.get("/profile", profile.getAdmin);
  router.put("/profile", profile.update);

  // `/reorder` must be declared before `/:id`.
  router.get("/projects", projects.listAdmin);
  router.post("/projects", projects.create);
  router.patch("/projects/reorder", projects.reorder);
  router.get("/projects/:id", projects.getAdmin);
  router.put("/projects/:id", projects.update);
  router.delete("/projects/:id", projects.remove);
  router.patch("/projects/:id/status", projects.setStatus);
  router.put("/projects/:id/blocks", projects.putBlocks);
  router.put("/projects/:id/metrics", projects.putMetrics);

  router.get("/experiences", experiences.listAdmin);
  router.post("/experiences", experiences.create);
  router.patch("/experiences/reorder", experiences.reorder);
  router.get("/experiences/:id", experiences.get);
  router.put("/experiences/:id", experiences.update);
  router.delete("/experiences/:id", experiences.remove);

  router.get("/certificates", certificates.listAdmin);
  router.post("/certificates", certificates.create);
  router.patch("/certificates/reorder", certificates.reorder);
  router.get("/certificates/:id", certificates.get);
  router.put("/certificates/:id", certificates.update);
  router.delete("/certificates/:id", certificates.remove);

  router.get("/achievements", achievements.listAdmin);
  router.post("/achievements", achievements.create);
  router.patch("/achievements/reorder", achievements.reorder);
  router.get("/achievements/:id", achievements.get);
  router.put("/achievements/:id", achievements.update);
  router.delete("/achievements/:id", achievements.remove);

  router.get("/technologies", technologies.listAdmin);
  router.post("/technologies", technologies.create);
  router.patch("/technologies/reorder", technologies.reorder);
  router.get("/technologies/:id", technologies.get);
  router.put("/technologies/:id", technologies.update);
  router.delete("/technologies/:id", technologies.remove);

  router.post("/media", limiters.upload, uploadSingle, media.upload);
  router.get("/media", media.list);
  router.get("/media/:id", media.get);
  router.patch("/media/:id", media.update);
  router.delete("/media/:id", media.remove);

  router.get("/messages", messages.list);
  router.get("/messages/:id", messages.get);
  router.patch("/messages/:id", messages.setRead);
  router.delete("/messages/:id", messages.remove);

  return router;
}
