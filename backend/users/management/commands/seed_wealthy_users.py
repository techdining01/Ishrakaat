import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds wealthy users across all admin levels for testing'

    def handle(self, *args, **kwargs):
        levels = [
            ("NATIONAL", "National"),
            ("STATE", "State"),
            ("LOCAL_GOVT", "Local_Govt"),
            ("WARD", "Ward"),
            ("NONE", "Regular")
        ]

        self.stdout.write("Starting to seed wealthy users...")
        for level_code, level_name in levels:
            base_username = f"wealthy_{level_name.lower()}_{random.randint(100,999)}"
            balance = Decimal(str(random.randint(3500000, 10000000)))
            
            user = User.objects.create_user(
                username=base_username,
                email=f"{base_username}@example.com",
                password="password123",
                first_name=f"{level_name}User",
                last_name=f"Test{random.randint(10,99)}",
                admin_level=level_code,
                money_box_balance=balance
            )
            user.is_staff = (level_code != "NONE")
            user.save()
            
            self.stdout.write(self.style.SUCCESS(f"Created {level_name} user: {user.username} | Balance: NGN {balance}"))

        self.stdout.write(self.style.SUCCESS("Seeding complete."))
