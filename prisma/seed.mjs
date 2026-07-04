import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function cuid() {
  return "c" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

const prisma = new PrismaClient();

const PERMISSIONS = {
  LEADS_VIEW: "leads:view",
  LEADS_CREATE: "leads:create",
  LEADS_EDIT_OWN: "leads:edit_own",
  LEADS_EDIT_ANY: "leads:edit_any",
  LEADS_DELETE: "leads:delete",
  LEADS_ASSIGN: "leads:assign",
  LEADS_EXPORT: "leads:export",
  PROPERTIES_VIEW: "properties:view",
  PROPERTIES_CREATE: "properties:create",
  PROPERTIES_EDIT: "properties:edit",
  PROPERTIES_DELETE: "properties:delete",
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_MARK_PAID: "payments:mark_paid",
  PAYMENTS_DELETE: "payments:delete",
  VISITS_VIEW: "visits:view",
  VISITS_MANAGE: "visits:manage",
  ADS_VIEW: "ads:view",
  ADS_SYNC: "ads:sync",
  TEAM_VIEW: "team:view",
  TEAM_INVITE: "team:invite",
  TEAM_REMOVE: "team:remove",
  ROLES_VIEW: "roles:view",
  ROLES_MANAGE: "roles:manage",
  AI_SCORE_LEADS: "ai:score_leads",
  AI_CHAT: "ai:chat",
  REPORTS_VIEW: "reports:view",
};

const ALL_PERMS = Object.values(PERMISSIONS);

const DEFAULT_ROLE_PERMISSIONS = {
  "Company Admin": ALL_PERMS,
  Manager: [
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.LEADS_EDIT_ANY, PERMISSIONS.LEADS_ASSIGN, PERMISSIONS.LEADS_EXPORT,
    PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.PROPERTIES_CREATE, PERMISSIONS.PROPERTIES_EDIT,
    PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_CREATE, PERMISSIONS.PAYMENTS_MARK_PAID,
    PERMISSIONS.VISITS_VIEW, PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_SYNC,
    PERMISSIONS.TEAM_VIEW, PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.AI_SCORE_LEADS, PERMISSIONS.AI_CHAT, PERMISSIONS.REPORTS_VIEW,
  ],
  Agent: [
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.VISITS_VIEW, PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.AI_CHAT,
  ],
  Viewer: [
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { id: cuid(), companyName: "NexDecade Properties", createdAt: new Date() },
    });
    console.log(`Created tenant: ${tenant.companyName}`);
  } else {
    console.log(`Using tenant: ${tenant.companyName} (${tenant.id})`);
  }

  // ── Roles ─────────────────────────────────────────────────────────
  const roleMap = {};
  for (const [name, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    let role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          id: cuid(),
          tenantId: tenant.id,
          name,
          isSystem: name === "Company Admin",
          isDefault: name === "Agent",
          createdAt: new Date(),
        },
      });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ id: cuid(), roleId: role.id, permission: p })),
      });
      console.log(`  Created role: ${name}`);
    }
    roleMap[name] = role;
  }

  // ── Admin user ────────────────────────────────────────────────────
  const ADMIN_EMAIL = "najmul@nexdecade.com";
  const ADMIN_PASS = "Admin@1234";

  let adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!adminUser) {
    const uid = cuid();
    const hash = await bcrypt.hash(ADMIN_PASS, 10);
    adminUser = await prisma.user.create({
      data: {
        id: uid,
        tenantId: tenant.id,
        roleId: roleMap["Company Admin"].id,
        name: "Najmul Islam",
        email: ADMIN_EMAIL,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.account.create({
      data: {
        id: cuid(),
        userId: uid,
        accountId: ADMIN_EMAIL,
        providerId: "credential",
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  Created admin: ${ADMIN_EMAIL}`);
  } else {
    console.log(`  Admin already exists: ${ADMIN_EMAIL}`);
  }

  // ── Extra agents ──────────────────────────────────────────────────
  const agentsData = [
    { name: "Rahim Uddin", email: "rahim@demo.com" },
    { name: "Fatema Begum", email: "fatema@demo.com" },
  ];
  const agents = [adminUser];
  for (const a of agentsData) {
    let u = await prisma.user.findUnique({ where: { email: a.email } });
    if (!u) {
      const uid = cuid();
      const hash = await bcrypt.hash("Demo@1234", 10);
      u = await prisma.user.create({
        data: {
          id: uid,
          tenantId: tenant.id,
          roleId: roleMap["Agent"].id,
          name: a.name,
          email: a.email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await prisma.account.create({
        data: {
          id: cuid(),
          userId: uid,
          accountId: a.email,
          providerId: "credential",
          password: hash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`  Created agent: ${a.name}`);
    }
    agents.push(u);
  }

  // ── Properties ────────────────────────────────────────────────────
  const existingProps = await prisma.property.count({ where: { tenantId: tenant.id } });
  const properties = [];
  if (existingProps === 0) {
    const propsData = [
      {
        title: "Gulshan 2 | 3 BHK Luxury Apartment",
        type: "APARTMENT",
        price: 12500000,
        sizeSqft: 1850,
        floor: 8,
        bedrooms: 3,
        locationArea: "Gulshan 2",
        status: "AVAILABLE",
        projectName: "City Tower",
        description: "Luxury apartment with gym, rooftop garden and 24/7 security.",
      },
      {
        title: "Bashundhara R/A | 5 Katha Corner Plot",
        type: "LAND",
        price: 18000000,
        sizeSqft: 3600,
        floor: null,
        bedrooms: null,
        locationArea: "Bashundhara R/A",
        status: "AVAILABLE",
        projectName: null,
        description: "Ready corner plot in Block C, fully developed road-facing.",
      },
      {
        title: "Dhanmondi | 1200 sqft Commercial Space",
        type: "COMMERCIAL",
        price: 9500000,
        sizeSqft: 1200,
        floor: 3,
        bedrooms: null,
        locationArea: "Dhanmondi",
        status: "BOOKED",
        projectName: "Dhanmondi Commercial Hub",
        description: "Prime commercial space near Dhanmondi 27, excellent footfall.",
      },
      {
        title: "Uttara Sector 7 | 2 BHK Affordable Apartment",
        type: "APARTMENT",
        price: 6800000,
        sizeSqft: 1100,
        floor: 5,
        bedrooms: 2,
        locationArea: "Uttara",
        status: "AVAILABLE",
        projectName: "Uttara Heights",
        description: "Affordable apartment near Uttara DOHS gate 2, ready to move.",
      },
    ];
    for (const p of propsData) {
      const prop = await prisma.property.create({
        data: { ...p, id: cuid(), tenantId: tenant.id, photoUrls: [] },
      });
      properties.push(prop);
      console.log(`  Created property: ${p.title}`);
    }
  } else {
    const existing = await prisma.property.findMany({ where: { tenantId: tenant.id } });
    properties.push(...existing);
    console.log(`  Properties already exist (${existing.length})`);
  }

  // ── Leads ─────────────────────────────────────────────────────────
  const existingLeads = await prisma.lead.count({ where: { tenantId: tenant.id } });
  const leads = [];
  if (existingLeads === 0) {
    const now = new Date();
    const dAgo = (n) => new Date(now.getTime() - n * 86400000);
    const dFwd = (n) => new Date(now.getTime() + n * 86400000);

    const leadsData = [
      {
        name: "Karim Hossain",
        phone: "8801711234567",
        email: "karim@email.com",
        source: "FACEBOOK",
        propertyType: "APARTMENT",
        budgetMin: 10000000,
        budgetMax: 15000000,
        locationArea: "Gulshan 2",
        pipelineStage: "NEGOTIATION",
        aiScore: "HOT",
        aiScoreReason: "High budget, advanced stage, Facebook lead — strong buying intent.",
        nextFollowUpAt: dFwd(1),
        agentIdx: 0,
        createdAt: dAgo(15),
        acts: [
          { daysAgo: 14, type: "note", desc: "Lead created via Facebook form" },
          { daysAgo: 10, type: "call", desc: "Initial call — very interested, wants to visit soon." },
          { daysAgo: 7, type: "visit", desc: "Site visit completed. Client loved the view and amenities." },
          { daysAgo: 3, type: "note", desc: "Negotiating price, expects 5% discount. Escalated to manager." },
          { daysAgo: 1, type: "call", desc: "Follow-up call — client agreed to meeting tomorrow." },
        ],
      },
      {
        name: "Sultana Parveen",
        phone: "8801812345678",
        email: "sultana@email.com",
        source: "MANUAL",
        propertyType: "APARTMENT",
        budgetMin: 6000000,
        budgetMax: 8000000,
        locationArea: "Uttara",
        pipelineStage: "INTERESTED",
        aiScore: "WARM",
        aiScoreReason: "Mid-range budget, actively interested, visit scheduled.",
        nextFollowUpAt: dFwd(2),
        agentIdx: 1,
        createdAt: dAgo(10),
        acts: [
          { daysAgo: 10, type: "note", desc: "Lead created — walk-in client" },
          { daysAgo: 7, type: "call", desc: "Called — interested in 2BHK, prefers upper floor." },
        ],
      },
      {
        name: "Mizanur Rahman",
        phone: "8801912345678",
        email: null,
        source: "REFERRAL",
        propertyType: "LAND",
        budgetMin: 15000000,
        budgetMax: 25000000,
        locationArea: "Bashundhara R/A",
        pipelineStage: "SITE_VISIT",
        aiScore: "HOT",
        aiScoreReason: "Large budget, referral source, high-value land inquiry.",
        nextFollowUpAt: dFwd(3),
        agentIdx: 0,
        createdAt: dAgo(8),
        acts: [
          { daysAgo: 8, type: "note", desc: "Referred by existing client Korim Mia" },
          { daysAgo: 5, type: "call", desc: "Interested in corner plot, budget is flexible." },
          { daysAgo: 2, type: "note", desc: "Site visit scheduled for day after tomorrow." },
        ],
      },
      {
        name: "Nasrin Akter",
        phone: "8801611223344",
        email: "nasrin@email.com",
        source: "WEBSITE",
        propertyType: "APARTMENT",
        budgetMin: 4500000,
        budgetMax: 7000000,
        locationArea: "Dhanmondi",
        pipelineStage: "CONTACTED",
        aiScore: "WARM",
        aiScoreReason: "Website lead, responsive, budget fits available stock.",
        nextFollowUpAt: dAgo(1),
        agentIdx: 1,
        createdAt: dAgo(6),
        acts: [
          { daysAgo: 6, type: "note", desc: "Website form submission" },
          { daysAgo: 4, type: "call", desc: "Called twice — no response. Will try again." },
        ],
      },
      {
        name: "Jabbar Sheikh",
        phone: "8801511334455",
        email: null,
        source: "FACEBOOK",
        propertyType: "COMMERCIAL",
        budgetMin: 8000000,
        budgetMax: 12000000,
        locationArea: "Dhanmondi",
        pipelineStage: "NEW",
        aiScore: "COLD",
        aiScoreReason: "New lead, no activities yet, commercial intent unclear.",
        nextFollowUpAt: null,
        agentIdx: 2,
        createdAt: dAgo(2),
        acts: [
          { daysAgo: 2, type: "note", desc: "Lead created via Facebook form" },
        ],
      },
      {
        name: "Rokshana Begum",
        phone: "8801711445566",
        email: "rokshana@email.com",
        source: "INSTAGRAM",
        propertyType: "APARTMENT",
        budgetMin: 9000000,
        budgetMax: 13000000,
        locationArea: "Gulshan 2",
        pipelineStage: "BOOKED",
        aiScore: "HOT",
        aiScoreReason: "Booked — deal closed successfully. High-value unit sold.",
        nextFollowUpAt: null,
        agentIdx: 0,
        createdAt: dAgo(35),
        acts: [
          { daysAgo: 35, type: "note", desc: "Lead from Instagram DM" },
          { daysAgo: 30, type: "call", desc: "First call — very interested in Gulshan unit." },
          { daysAgo: 25, type: "visit", desc: "Site visit — impressed by building quality." },
          { daysAgo: 20, type: "note", desc: "Sent quotation and floor plan." },
          { daysAgo: 15, type: "stage_change", desc: "Stage changed from NEGOTIATION to BOOKED" },
          { daysAgo: 15, type: "payment", desc: "Booking money ৳5,00,000 received via bKash" },
        ],
      },
      {
        name: "Tanvir Ahmed",
        phone: "8801811556677",
        email: "tanvir@email.com",
        source: "MANUAL",
        propertyType: "APARTMENT",
        budgetMin: 5000000,
        budgetMax: 6500000,
        locationArea: "Uttara",
        pipelineStage: "LOST",
        aiScore: "COLD",
        aiScoreReason: "Lost lead — went with a competitor offering lower price.",
        nextFollowUpAt: null,
        agentIdx: 1,
        createdAt: dAgo(20),
        acts: [
          { daysAgo: 20, type: "note", desc: "Walk-in lead" },
          { daysAgo: 16, type: "call", desc: "Discussed unit options and pricing." },
          { daysAgo: 12, type: "note", desc: "Client visiting other projects." },
          { daysAgo: 8, type: "stage_change", desc: "Stage changed from INTERESTED to LOST — chose competitor." },
        ],
      },
      {
        name: "Shireen Sultana",
        phone: "8801911667788",
        email: null,
        source: "REFERRAL",
        propertyType: "LAND",
        budgetMin: 20000000,
        budgetMax: 30000000,
        locationArea: "Bashundhara R/A",
        pipelineStage: "INTERESTED",
        aiScore: "WARM",
        aiScoreReason: "High-budget land buyer via referral — needs follow-up.",
        nextFollowUpAt: dFwd(5),
        agentIdx: 2,
        createdAt: dAgo(5),
        acts: [
          { daysAgo: 5, type: "note", desc: "Referral from Mizanur Rahman" },
          { daysAgo: 3, type: "call", desc: "Initial call — looking for 7+ katha plot." },
        ],
      },
    ];

    const agentUsers = agents;
    for (const l of leadsData) {
      const agent = agentUsers[l.agentIdx % agentUsers.length];
      const leadId = cuid();
      const lead = await prisma.lead.create({
        data: {
          id: leadId,
          tenantId: tenant.id,
          agentId: agent.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          source: l.source,
          propertyType: l.propertyType,
          budgetMin: l.budgetMin,
          budgetMax: l.budgetMax,
          locationArea: l.locationArea,
          pipelineStage: l.pipelineStage,
          aiScore: l.aiScore,
          aiScoreReason: l.aiScoreReason,
          aiScoredAt: new Date(),
          nextFollowUpAt: l.nextFollowUpAt,
          createdAt: l.createdAt,
          updatedAt: new Date(),
        },
      });
      leads.push(lead);

      // Activities
      for (const act of l.acts) {
        await prisma.leadActivity.create({
          data: {
            id: cuid(),
            leadId: lead.id,
            createdById: agent.id,
            type: act.type,
            description: act.desc,
            createdAt: new Date(now.getTime() - act.daysAgo * 86400000),
          },
        });
      }
      console.log(`  Created lead: ${l.name} (${l.pipelineStage})`);
    }
  } else {
    const existing = await prisma.lead.findMany({ where: { tenantId: tenant.id } });
    leads.push(...existing);
    console.log(`  Leads already exist (${existing.length})`);
  }

  // ── Lead ↔ Property links ──────────────────────────────────────────
  if (leads.length >= 6 && properties.length >= 4) {
    const links = [
      { leadId: leads[0].id, propertyId: properties[0].id },
      { leadId: leads[1].id, propertyId: properties[3].id },
      { leadId: leads[2].id, propertyId: properties[1].id },
      { leadId: leads[5].id, propertyId: properties[0].id },
    ];
    for (const link of links) {
      const exists = await prisma.leadProperty.findFirst({
        where: { leadId: link.leadId, propertyId: link.propertyId },
      });
      if (!exists) {
        await prisma.leadProperty.create({ data: { id: cuid(), ...link } });
      }
    }
    console.log("  Created lead-property links");
  }

  // ── Payments ───────────────────────────────────────────────────────
  const existingPayments = await prisma.payment.count({ where: { tenantId: tenant.id } });
  if (existingPayments === 0 && leads.length >= 6) {
    const bookedLead = leads[5];
    const now = new Date();
    const dAgo = (n) => new Date(now.getTime() - n * 86400000);
    const dFwd = (n) => new Date(now.getTime() + n * 86400000);

    await prisma.payment.createMany({
      data: [
        {
          id: cuid(), tenantId: tenant.id,
          leadId: bookedLead.id, propertyId: properties[0]?.id,
          type: "BOOKING_MONEY", amount: 500000,
          dueDate: dAgo(30), paidDate: dAgo(30), status: "PAID",
          method: "bkash", reference: "TXN20260601001",
          note: "Booking money received via bKash",
          createdAt: dAgo(30),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: bookedLead.id, propertyId: properties[0]?.id,
          type: "DOWN_PAYMENT", amount: 2500000,
          dueDate: dAgo(15), paidDate: dAgo(14), status: "PAID",
          method: "bank", reference: "CHQ-2026-0455",
          note: null, createdAt: dAgo(20),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: bookedLead.id, propertyId: properties[0]?.id,
          type: "INSTALLMENT", amount: 1000000,
          dueDate: dAgo(5), paidDate: null, status: "OVERDUE",
          method: null, reference: null,
          note: "1st installment — client requested 1 week extension",
          createdAt: dAgo(20),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: bookedLead.id, propertyId: properties[0]?.id,
          type: "INSTALLMENT", amount: 1000000,
          dueDate: dFwd(25), paidDate: null, status: "PENDING",
          method: null, reference: null,
          note: "2nd installment", createdAt: dAgo(20),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: leads[3].id, propertyId: null,
          type: "BOOKING_MONEY", amount: 200000,
          dueDate: dAgo(10), paidDate: null, status: "OVERDUE",
          method: null, reference: null,
          note: null, createdAt: dAgo(12),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: bookedLead.id, propertyId: properties[0]?.id,
          type: "FINAL_PAYMENT", amount: 8500000,
          dueDate: dFwd(60), paidDate: null, status: "PENDING",
          method: null, reference: null,
          note: "Final payment on possession", createdAt: dAgo(15),
        },
      ],
    });
    console.log("  Created payments");
  }

  // ── Site visits ────────────────────────────────────────────────────
  const existingVisits = await prisma.siteVisit.count({ where: { tenantId: tenant.id } });
  if (existingVisits === 0 && leads.length >= 3) {
    const now = new Date();
    const dAgo = (n) => new Date(now.getTime() - n * 86400000);
    const dFwd = (n) => new Date(now.getTime() + n * 86400000);
    const todayAt = (h, m) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    await prisma.siteVisit.createMany({
      data: [
        {
          id: cuid(), tenantId: tenant.id,
          leadId: leads[0].id, agentId: agents[0].id,
          scheduledAt: dAgo(3),
          location: "City Tower, Gulshan 2, Dhaka",
          status: "COMPLETED",
          note: "Client arrived on time. Very positive — wants to proceed.",
          createdAt: dAgo(4),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: leads[2].id, agentId: agents[0].id,
          scheduledAt: dFwd(2),
          location: "Bashundhara R/A Block C, Gate 2",
          status: "SCHEDULED",
          note: null,
          createdAt: dAgo(1),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: leads[1].id, agentId: agents[1 % agents.length].id,
          scheduledAt: todayAt(15, 0),
          location: "Uttara Heights, Sector 7",
          status: "SCHEDULED",
          note: "Client coming with family.",
          createdAt: dAgo(2),
        },
        {
          id: cuid(), tenantId: tenant.id,
          leadId: leads[5].id, agentId: agents[0].id,
          scheduledAt: dAgo(25),
          location: "City Tower, Gulshan 2, Dhaka",
          status: "COMPLETED",
          note: "Completed. Client confirmed purchase after this visit.",
          createdAt: dAgo(26),
        },
      ],
    });
    console.log("  Created site visits");
  }

  // ── Meta Ad Campaigns ──────────────────────────────────────────────
  const existingAds = await prisma.metaAdCampaign.count({ where: { tenantId: tenant.id } });
  if (existingAds === 0) {
    await prisma.metaAdCampaign.createMany({
      data: [
        {
          id: cuid(), tenantId: tenant.id,
          campaignId: "camp_001",
          name: "Gulshan Apartment — Lead Gen Q2",
          spendBdt: 45000, impressions: 128400, clicks: 3210, leadsCount: 24,
          syncedAt: new Date(),
        },
        {
          id: cuid(), tenantId: tenant.id,
          campaignId: "camp_002",
          name: "Bashundhara Land — Retargeting",
          spendBdt: 28500, impressions: 87200, clicks: 1940, leadsCount: 11,
          syncedAt: new Date(),
        },
        {
          id: cuid(), tenantId: tenant.id,
          campaignId: "camp_003",
          name: "Uttara Heights — Brand Awareness",
          spendBdt: 18000, impressions: 210000, clicks: 890, leadsCount: 6,
          syncedAt: new Date(),
        },
      ],
    });
    console.log("  Created meta ad campaigns");
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
  console.log(`   Agent logins: rahim@demo.com / fatema@demo.com  (password: Demo@1234)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
