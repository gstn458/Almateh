import { motion } from "framer-motion";
import { activities } from "../data/content";
import ActivityList from "./ActivityList";
import SectionHeader, { revealTransition } from "./SectionHeader";

// What each leadership role still needs, shown as a TODO on the dev server.
export const LEADERSHIP_TODOS: Record<string, string> = {
  "Student Council member": "Student Council role",
  "House Captain": "house name",
};

export default function Activities() {
  return (
    <section id="activities" aria-labelledby="activities-heading" className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <SectionHeader
          id="activities-heading"
          eyebrow={activities.eyebrow}
          title={
            <>
              {activities.title} <span className="font-display italic">{activities.titleEmphasis}</span>
            </>
          }
          subtext={activities.subtext}
        />

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          {[
            { heading: activities.leadershipHeading, items: activities.leadership, todos: LEADERSHIP_TODOS },
            { heading: activities.competitionsHeading, items: activities.competitions },
          ].map((group, index) => (
            <motion.div
              key={group.heading}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...revealTransition, delay: index * 0.1 }}
            >
              <h3 className="mb-6 text-xs uppercase tracking-[0.3em] text-muted">{group.heading}</h3>
              <ActivityList items={group.items} todoDetail={group.todos} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
