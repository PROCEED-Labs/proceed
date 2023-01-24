package org.proceedlabs.engine.android.Utility;

import android.net.nsd.NsdManager;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

public interface DiscoveryRegistrationListener extends NsdManager.RegistrationListener {
    void setParamsForUnregister(NativeRequest req);
}
