package org.proceedlabs.engine.android.FormatAPI.Interfaces;

import org.proceedlabs.engine.android.MainActivity;
import org.proceedlabs.engine.android.Utility.PermissionManager;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public abstract class Task {
    public String[] requiredPermissions = {};

    public boolean checkPermissions(MainActivity main) {
        return PermissionManager.checkPermission(main, requiredPermissions);
    }

    public void addPermission(String... permission) {
        Set set = new HashSet<String>();
        set.addAll(Arrays.asList(requiredPermissions));
        set.addAll(Arrays.asList(permission));
        requiredPermissions = new String[set.size()];
        set.toArray(requiredPermissions);
    }
}
