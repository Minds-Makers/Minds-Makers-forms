-- Optional seed: inserts the "Compile Student Survey" template as a draft form.
-- Run AFTER schema.sql and AFTER you've created your admin user.
--
-- Replace 'YOUR_ADMIN_USER_UUID' below with your admin user's id
-- (Supabase dashboard -> Authentication -> Users -> copy the UUID),
-- then run this file in the SQL editor.
--
-- The `schema` JSON below mirrors src/lib/seedTemplate.ts exactly — if you
-- change one, change the other.

insert into forms (owner_id, title, slug, status, schema, version, settings)
values (
  'YOUR_ADMIN_USER_UUID',
  'Compile Student Survey',
  'compile-student-survey',
  'draft',
  '{
    "intro": {
      "eyebrow": "Minds Makers · Student research",
      "headline": "Tell us what it takes to get job-ready.",
      "headlineHighlight": "job-ready.",
      "lead": "We''re Minds Makers, testing an idea called Compile: a platform where you complete tasks inside a simulated company to build real, documented work experience before you graduate. Before we build anything, we want to understand your situation.",
      "facts": [
        "Takes about 5–7 minutes.",
        "There are no right or wrong answers — honesty is more useful than approval.",
        "Responses are anonymous, and email at the end is optional."
      ],
      "consentRequired": true,
      "consentText": "I agree that my answers may be used, in aggregate, for this project''s research.",
      "startLabel": "Start"
    },
    "steps": [
      {
        "id": "about",
        "title": "About you",
        "hint": "So we know who we''re hearing from.",
        "questions": [
          { "id": "year", "type": "single", "label": "What stage are you at?",
            "options": ["1st year", "2nd year", "3rd year", "4th year", "Recent graduate (under 2 years)", "Graduate (2+ years)"] },
          { "id": "university", "type": "text", "label": "University and faculty", "placeholder": "e.g. Cairo University, Faculty of Computers" },
          { "id": "track", "type": "single", "label": "Your major or track",
            "options": ["Computer Science", "Information Systems", "AI", "Software Engineering", "Cybersecurity", "Not decided yet", "Other"] },
          { "id": "job_status", "type": "single", "label": "Your current status",
            "options": ["Studying only", "In an internship or volunteering", "Working in tech already", "Graduated, job hunting", "Working in a different field"] }
        ]
      },
      {
        "id": "experience",
        "title": "Real work experience so far",
        "hint": "Answer about what you''ve actually done, not what you plan to do.",
        "questions": [
          { "id": "has_experience", "type": "single", "label": "Do you have any real hands-on work experience?",
            "options": ["Yes, a paid or formal internship", "Yes, an unpaid internship or volunteering", "Yes, freelance or personal projects only", "No, none yet"] },
          { "id": "experience_source", "type": "multi", "label": "If yes — where did that experience come from? (select all that apply)",
            "options": ["A company internship", "A university-arranged program", "A personal project I built alone", "Freelance work", "Open-source contributions", "A coding bootcamp with real projects", "Other"] },
          { "id": "confidence", "type": "single", "label": "How confident are you that you could handle real day-to-day tasks at a junior dev job right now?",
            "options": ["Very confident", "Somewhat confident", "Not very confident", "Not confident at all"] }
        ]
      },
      {
        "id": "problems",
        "title": "The problems you face",
        "hint": "Rate how much each one affects you.",
        "questions": [
          { "id": "problems_scale", "type": "scales", "label": "How much of a problem is each of these for you?",
            "low": "Not a problem", "high": "A major problem",
            "items": [
              { "id": "p_no_practice", "label": "Not enough practical, job-like work to practice on" },
              { "id": "p_unclear_expect", "label": "Not knowing what employers actually expect from a junior" },
              { "id": "p_no_internship", "label": "Limited access to internships or entry-level opportunities" },
              { "id": "p_no_feedback", "label": "No one reviews my work the way a real employer would" },
              { "id": "p_no_proof", "label": "Nothing to show employers besides grades and a CV" },
              { "id": "p_workplace_unknown", "label": "Not understanding what a real workplace is actually like" }
            ]
          },
          { "id": "biggest_problem", "type": "textarea", "optional": true, "label": "Any other problem not listed here?", "placeholder": "Write freely" }
        ]
      },
      {
        "id": "tools",
        "title": "What you use today",
        "hint": "We want to know what''s already working for you, and what isn''t.",
        "questions": [
          { "id": "tools", "type": "multi", "label": "What do you currently use to prepare for the job market? (select all that apply)",
            "options": ["LeetCode / HackerRank / Codeforces", "YouTube tutorials", "Udemy or Coursera courses", "ChatGPT or other AI tools", "Personal projects", "University career services", "Facebook or Telegram groups", "GitHub", "Nothing structured", "Other"] },
          { "id": "tools_dislike", "type": "textarea", "optional": true, "label": "What''s missing or frustrating about these?", "placeholder": "Write freely" },
          { "id": "past_platform", "type": "single", "label": "Have you tried a platform like this before (job-simulation or practical training)?",
            "options": ["Tried it and kept using it", "Tried it and stopped", "Never tried one"] },
          { "id": "quit_reason", "type": "textarea", "optional": true, "label": "Why did you stop?", "placeholder": "Write freely",
            "showIf": { "id": "past_platform", "equals": "Tried it and stopped" } }
        ]
      },
      {
        "id": "idea",
        "title": "The idea we''re testing",
        "hint": "This is Compile: you join a fictional company and complete realistic tasks — tickets, features, bug fixes — under deadlines and feedback, before you graduate. It''s not built yet, so your honest opinion matters more than encouragement.",
        "questions": [
          { "id": "value_scale", "type": "scales", "label": "How valuable would each part of this be to you?",
            "low": "Not valuable", "high": "Very valuable",
            "items": [
              { "id": "v_tasks", "label": "Realistic tasks modeled on real junior-dev work" },
              { "id": "v_feedback", "label": "Feedback on your submissions, like a code review" },
              { "id": "v_record", "label": "A documented record of completed work to show employers" },
              { "id": "v_deadlines", "label": "Working under deadlines, similar to a real job" }
            ]
          },
          { "id": "would_use", "type": "single", "label": "If this existed today, would you use it?",
            "options": ["Yes, definitely", "Probably", "Not sure", "Probably not"] },
          { "id": "missing_feature", "type": "textarea", "optional": true, "label": "Anything you''d want from something like this that we haven''t mentioned?", "placeholder": "Write freely" }
        ]
      },
      {
        "id": "final",
        "title": "Last step",
        "hint": "Everything here is optional except the first question.",
        "questions": [
          { "id": "would_try", "type": "single", "label": "If a free trial version launched, would you try it?",
            "options": ["Yes, definitely", "Maybe", "Not interested"] },
          { "id": "email", "type": "email", "optional": true, "label": "Want us to reach out when the trial is ready? Leave your email",
            "hint": "We''ll only use it to contact you about this project.", "placeholder": "name@example.com" },
          { "id": "interview_ok", "type": "multi", "optional": true, "label": "",
            "options": [{ "value": "yes", "label": "I''m open to a short follow-up interview (about 20 minutes)" }] },
          { "id": "final_notes", "type": "textarea", "optional": true, "label": "Any final thoughts?", "placeholder": "Write freely" }
        ]
      }
    ],
    "consent": {
      "id": "consent",
      "type": "multi",
      "label": "",
      "options": [{ "value": "yes", "label": "I agree that my answers may be used, in aggregate, for this project''s research." }]
    }
  }'::jsonb,
  0,
  '{}'::jsonb
);
