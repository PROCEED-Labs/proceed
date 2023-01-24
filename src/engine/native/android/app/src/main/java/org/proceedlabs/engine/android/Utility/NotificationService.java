package org.proceedlabs.engine.android.Utility;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.proceedlabs.engine.android.MainActivity;
import org.proceedlabs.engine.android.R;

public class NotificationService extends Service {
    private final static String CHANNEL_ID = "2345";
    public final static int BASE_NOTIFICATION_ID = 0;

    public static String BRING_APP_TO_FRONT_ACTION = "bringtofront";
    public static String SHUT_APP_DOWN_ACTION = "shutdown";

    public static String STOP_SERVICE_ACTION = "stopservice";
    public static String START_SERVICE_ACTION = "startservice";

    public static void startService(Context context) {
        Intent intent = new Intent(context, NotificationService.class);
        intent.setAction(START_SERVICE_ACTION);

        context.startService(intent);

    }

    public static void stopSercice(Context context) {
        Intent intent = new Intent(context, NotificationService.class);
        intent.setAction(STOP_SERVICE_ACTION);

        context.startService(intent);

    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent.getAction().equals(STOP_SERVICE_ACTION)) {
            deleteBaseNotification();
            stopSelf();
        }

        return super.onStartCommand(intent, flags, startId);
    }

    @Override
    public void onCreate() {
        createNotificationChannel();
        Notification notification = createNotification("Engine is running", BASE_NOTIFICATION_ID);
        startForeground(BASE_NOTIFICATION_ID, notification);
    }


    private Notification createNotification(String message, int notificationId) {
        //open App Intent
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT);
        openIntent.setAction(BRING_APP_TO_FRONT_ACTION);
        PendingIntent pendingOpenIntent = PendingIntent.getActivity(this, 0, openIntent, 0);

        //close APp Intent
        Intent closeIntent = new Intent(this, MainActivity.class);
        closeIntent.setFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT);
        closeIntent.setAction(SHUT_APP_DOWN_ACTION);
        PendingIntent pendingCloseIntent = PendingIntent.getActivity(this, 0, closeIntent, 0);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_proceed)
                .setDefaults(Notification.DEFAULT_ALL)
                .setContentTitle("PROCEED")
                .setContentText(message)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(false)
                //set Intents
                .setContentIntent(pendingOpenIntent)
                .addAction(R.drawable.ic_proceed, "shut down",
                        pendingCloseIntent);
        Notification notification = builder.build();

        NotificationManager notificationManager = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId, notification);

        return notification;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "General";
            String description = "status info";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);

            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            NotificationManager notificationManager = this.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void deleteBaseNotification() {
        NotificationManager notificationManager = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(BASE_NOTIFICATION_ID);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
