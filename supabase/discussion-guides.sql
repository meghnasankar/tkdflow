-- Real editorial discussion guides, not fictional member activity.
begin;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('e3575f0d-d099-5f5b-8b54-86240a223faa','forms-discussion','Why can the same belt have different forms at different schools?','Start by comparing the curriculum your own school gives you with the form names in the library. A belt color alone does not identify an identical curriculum across every school.

If you want to compare two versions, include the form name, organization and the part of the movement sequence you are asking about. Link to a public reference when available; avoid sharing private school documents without permission.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('8ed923a0-5c90-5103-a9a8-c8a069e58b4e','forms-discussion','How to study a difficult transition with TKDflow','Open a lesson, pause at the transition, and use slow playback and the camera controls. The pose-link button lets you share the exact study pose in a question.

Describe which foot, hand or direction is confusing you. A focused question about one transition is easier to discuss than a request to judge an entire form.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('f498178a-cd12-5c69-a816-fcf45a18bfb4','technique-qa','What information makes a technique question useful?','Name the technique, the form and the side of the body involved. Describe what you were taught and what you are trying to understand.

For a movement in this library, add a pose link. Keep feedback specific and respectful, and distinguish an observation from a teaching convention that may vary by school.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('f66fc141-9688-5e3b-9474-ed94863ea5a7','competitions','Which tournament organization should I look at first?','Start with the organization your school competes in. Use the events calendar’s organization, country, discipline and year filters to compare published events.

Open the organizer’s page for eligibility, divisions, entry requirements and current dates. An event listing is a starting point, not an entry confirmation.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('e153fc54-e451-5ef4-af12-79c0efb33fc6','competitions','A checklist for reading an event information packet','Look for the event dates and venue, organization, age and rank divisions, permitted disciplines, entry deadline and the organizer’s contact route.

If two official pages disagree, ask the organizer before entering or booking travel. You can discuss the public information here without sharing your registration, date of birth or travel itinerary.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('8f6b82d2-c2cf-5414-a609-cc3fcd33a432','grading-testing','Build a study checklist from your own school’s curriculum','Write down the forms, terminology and techniques your school expects for your next grading. Add the particular transitions or questions you want to revisit.

Use the library as a reference while keeping your school’s requirements as the checklist for that grading. What part of your current curriculum would benefit from a clearer explanation?','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('dfe87518-ec3e-5013-9b2a-ab7fb3a6713e','training','Plan a focused practice session','Choose one small goal: remembering a sequence, understanding a turn, or comparing a particular stance from two camera views. Review it slowly, practice with attention, and write down one question for your next class.

Share a learning habit that helps you remember forms. Keep suggestions appropriate to the experience of the person asking.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('cbc4188b-a7c0-5c0e-a9b4-fb5ae890c851','sparring','Keep rules discussions specific to the event','When asking about a rule, name the organizer, event and rules edition if it is available. Different formats and divisions can use different requirements.

Link the relevant official rule or event packet and quote only the small part needed for the question. Avoid presenting one tournament’s rule as universal.','TKDflow',true,'published') on conflict(id) do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status) values('366b4897-5623-5e1e-9ca6-f8755f441a1e','general','What would make taekwondo education clearer for you?','TKDflow began with a question Meghna encountered across schools: how can students better understand forms, belt systems, curricula and competitions?

Tell us which topic or comparison would help you most. Concrete examples are useful: a form transition, a curriculum term, or an event requirement you found hard to interpret.','TKDflow',true,'published') on conflict(id) do nothing;
commit;
