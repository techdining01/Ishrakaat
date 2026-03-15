# Generated migration for adding new fields to NisabData model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('zakah', '0004_nisabdata'),
    ]

    operations = [
        migrations.AddField(
            model_name='nisabdata',
            name='gold_nisab_ngn',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
        migrations.AddField(
            model_name='nisabdata',
            name='silver_nisab_ngn',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
        migrations.AddField(
            model_name='nisabdata',
            name='usd_ngn_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
