from plyer import notification
import time
import random

# Bright-Minds Mentor Notifications
mentor_reminders = [
    ("📚 Study Time!", 
     "Start studying now. 1 hour of focused study = step closer to success."),

    ("📝 Assignment Practice", 
     "Practice your assignments today. Consistency builds mastery."),

    ("✍️ Blog Reminder", 
     "Have you posted your learning blog? Share your knowledge!"),

    ("❓ Ask Your Mentor", 
     "If you have any doubts, don’t hesitate. Ask your mentor today."),

    ("👀 Watch Stories", 
     "Check and watch Bright-Minds success stories for motivation."),

    ("🚀 Career Boost", 
     "Small daily progress leads to big career achievements!")
]

def bright_minds_mentor():
    while True:
        title, message = random.choice(mentor_reminders)

        notification.notify(
            title="Bright-Minds Mentor",
            message=f"{title}\n{message}",
            timeout=5
        )

        # Wait 30 minutes before next notification
        time.sleep(30)   # 1800 seconds = 30 minutes

bright_minds_mentor()
